"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/result";
import {
  clientSignInputSchema,
  declineInputSchema,
  otpCodeSchema,
} from "@/lib/validation/signing";
import { getRequestMeta } from "@/server/services/audit";
import {
  assertSigningRateLimit,
  declineContract,
  getSigningContext,
  requestSigningOtp,
  submitClientSignature,
  verifySigningOtp,
  type SigningContext,
} from "@/server/services/signing";
import { runAction } from "./_run";

const tokenSchema = z.object({
  token: z.string().min(1, "errors.required").max(200),
});

export async function getSigningContextAction(
  raw: unknown,
): Promise<ActionResult<SigningContext>> {
  return runAction(async () => {
    const { token } = tokenSchema.parse(raw);
    const meta = await getRequestMeta();
    assertSigningRateLimit(meta.ip);
    return getSigningContext(token, meta);
  });
}

export async function requestSigningOtpAction(
  raw: unknown,
): Promise<ActionResult<{ expiresAt: number }>> {
  return runAction(async () => {
    const { token } = tokenSchema.parse(raw);
    const meta = await getRequestMeta();
    assertSigningRateLimit(meta.ip);
    return requestSigningOtp(token, meta);
  });
}

export async function verifySigningOtpAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { token, code } = tokenSchema.merge(otpCodeSchema).parse(raw);
    const meta = await getRequestMeta();
    assertSigningRateLimit(meta.ip);
    verifySigningOtp(token, code, meta);
    return null;
  });
}

export async function submitClientSignatureAction(
  raw: unknown,
): Promise<ActionResult<{ signed: true; finalized: boolean }>> {
  return runAction(async () => {
    const { token, ...rest } = tokenSchema
      .merge(clientSignInputSchema)
      .parse(raw);
    const meta = await getRequestMeta();
    assertSigningRateLimit(meta.ip);
    return submitClientSignature(token, rest, meta);
  });
}

export async function declineContractAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { token, reason } = tokenSchema.merge(declineInputSchema).parse(raw);
    const meta = await getRequestMeta();
    assertSigningRateLimit(meta.ip);
    declineContract(token, reason, meta);
    return null;
  });
}
