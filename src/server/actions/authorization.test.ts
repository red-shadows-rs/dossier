import { beforeAll, describe, expect, it, vi } from "vitest";

// 9.12 / 20.4 — table-driven authorization test. It enumerates every
const authState = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "dossier_session" && authState.token
        ? { value: authState.token }
        : undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: async () => ({ get: () => null }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

import { withTx } from "@/db";
import { createSession } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";

import {
  changePasswordAction,
  updateAccountAction,
} from "./account";
import {
  archiveClientAction,
  createClientAction,
  deleteClientAction,
  unarchiveClientAction,
  updateClientAction,
} from "./clients";
import {
  cancelContractAction,
  completeContractAction,
  createContractAction,
  deleteDraftContractAction,
  getContractPreviewHtmlAction,
  previewTotalsAction,
  regenerateSigningLinkAction,
  reviseContractAction,
  retryFinalizeAction,
  saveClausesAction,
  saveContractItemsAction,
  saveMilestonesAction,
  sendContractAction,
  signAsProviderAction,
  terminateContractAction,
  updateContractBasicsAction,
} from "./contracts";
import {
  deleteAttachmentAction,
  uploadAttachmentAction,
} from "./files";
import {
  createInvoiceAction,
  createInvoiceFromMilestoneAction,
  deleteDraftInvoiceAction,
  getInvoicePreviewHtmlAction,
  issueInvoiceAction,
  previewInvoiceTotalsAction,
  saveInvoiceLinesAction,
  sendInvoiceEmailAction,
  updateInvoiceDraftAction,
  voidInvoiceAction,
} from "./invoices";
import { recordPaymentAction, voidPaymentAction } from "./payments";
import {
  archiveProjectAction,
  createProjectAction,
  setProjectStatusAction,
  unarchiveProjectAction,
  updateProjectAction,
} from "./projects";
import {
  sendTestEmailAction,
  updateCompanyAction,
  updateDefaultsAction,
  updateEmailAction,
  updateNumberingAction,
  updateSigningAction,
} from "./settings";
import {
  archiveTemplateAction,
  createTemplateAction,
  duplicateTemplateAction,
  updateTemplateAction,
} from "./templates";
import {
  createUserAction,
  setUserPasswordAction,
  setUserStatusAction,
  updateUserAction,
} from "./users";

type Action = (raw?: unknown) => Promise<unknown>;
type Entry = { name: string; action: Action; viewerForbidden: boolean };

const TABLE: Entry[] = [
  { name: "createClientAction", action: createClientAction, viewerForbidden: true },
  { name: "updateClientAction", action: updateClientAction, viewerForbidden: true },
  { name: "archiveClientAction", action: archiveClientAction, viewerForbidden: true },
  { name: "unarchiveClientAction", action: unarchiveClientAction, viewerForbidden: true },
  { name: "deleteClientAction", action: deleteClientAction, viewerForbidden: true },

  { name: "createProjectAction", action: createProjectAction, viewerForbidden: true },
  { name: "updateProjectAction", action: updateProjectAction, viewerForbidden: true },
  { name: "setProjectStatusAction", action: setProjectStatusAction, viewerForbidden: true },
  { name: "archiveProjectAction", action: archiveProjectAction, viewerForbidden: true },
  { name: "unarchiveProjectAction", action: unarchiveProjectAction, viewerForbidden: true },

  { name: "createContractAction", action: createContractAction, viewerForbidden: true },
  { name: "updateContractBasicsAction", action: updateContractBasicsAction, viewerForbidden: true },
  { name: "saveContractItemsAction", action: saveContractItemsAction, viewerForbidden: true },
  { name: "saveMilestonesAction", action: saveMilestonesAction, viewerForbidden: true },
  { name: "saveClausesAction", action: saveClausesAction, viewerForbidden: true },
  { name: "deleteDraftContractAction", action: deleteDraftContractAction, viewerForbidden: true },
  { name: "previewTotalsAction", action: previewTotalsAction, viewerForbidden: true },
  { name: "retryFinalizeAction", action: retryFinalizeAction, viewerForbidden: true },
  { name: "reviseContractAction", action: reviseContractAction, viewerForbidden: true },
  { name: "completeContractAction", action: completeContractAction, viewerForbidden: true },
  { name: "cancelContractAction", action: cancelContractAction, viewerForbidden: true },
  { name: "sendContractAction", action: sendContractAction, viewerForbidden: true },
  { name: "signAsProviderAction", action: signAsProviderAction, viewerForbidden: true },
  { name: "regenerateSigningLinkAction", action: regenerateSigningLinkAction, viewerForbidden: true },
  { name: "terminateContractAction", action: terminateContractAction, viewerForbidden: true },
  { name: "getContractPreviewHtmlAction", action: getContractPreviewHtmlAction, viewerForbidden: false },

  { name: "createInvoiceAction", action: createInvoiceAction, viewerForbidden: true },
  { name: "createInvoiceFromMilestoneAction", action: createInvoiceFromMilestoneAction, viewerForbidden: true },
  { name: "updateInvoiceDraftAction", action: updateInvoiceDraftAction, viewerForbidden: true },
  { name: "saveInvoiceLinesAction", action: saveInvoiceLinesAction, viewerForbidden: true },
  { name: "deleteDraftInvoiceAction", action: deleteDraftInvoiceAction, viewerForbidden: true },
  { name: "previewInvoiceTotalsAction", action: previewInvoiceTotalsAction, viewerForbidden: true },
  { name: "issueInvoiceAction", action: issueInvoiceAction, viewerForbidden: true },
  { name: "sendInvoiceEmailAction", action: sendInvoiceEmailAction, viewerForbidden: true },
  { name: "voidInvoiceAction", action: voidInvoiceAction, viewerForbidden: true },
  { name: "getInvoicePreviewHtmlAction", action: getInvoicePreviewHtmlAction, viewerForbidden: false },

  { name: "recordPaymentAction", action: recordPaymentAction, viewerForbidden: true },
  { name: "voidPaymentAction", action: voidPaymentAction, viewerForbidden: true },

  { name: "uploadAttachmentAction", action: uploadAttachmentAction as unknown as Action, viewerForbidden: true },
  { name: "deleteAttachmentAction", action: deleteAttachmentAction, viewerForbidden: true },

  { name: "updateCompanyAction", action: updateCompanyAction, viewerForbidden: true },
  { name: "updateDefaultsAction", action: updateDefaultsAction, viewerForbidden: true },
  { name: "updateNumberingAction", action: updateNumberingAction, viewerForbidden: true },
  { name: "updateSigningAction", action: updateSigningAction, viewerForbidden: true },
  { name: "updateEmailAction", action: updateEmailAction, viewerForbidden: true },
  { name: "sendTestEmailAction", action: sendTestEmailAction, viewerForbidden: true },

  { name: "createTemplateAction", action: createTemplateAction, viewerForbidden: true },
  { name: "updateTemplateAction", action: updateTemplateAction, viewerForbidden: true },
  { name: "duplicateTemplateAction", action: duplicateTemplateAction, viewerForbidden: true },
  { name: "archiveTemplateAction", action: archiveTemplateAction, viewerForbidden: true },

  { name: "createUserAction", action: createUserAction, viewerForbidden: true },
  { name: "updateUserAction", action: updateUserAction, viewerForbidden: true },
  { name: "setUserStatusAction", action: setUserStatusAction, viewerForbidden: true },
  { name: "setUserPasswordAction", action: setUserPasswordAction, viewerForbidden: true },

  { name: "updateAccountAction", action: updateAccountAction, viewerForbidden: false },
  { name: "changePasswordAction", action: changePasswordAction, viewerForbidden: false },
];

type Result = { ok: boolean; error?: { code?: string } };

let viewerToken: string;

beforeAll(async () => {
  const viewer = await createTestUser({ role: "viewer" });
  viewerToken = withTx((tx) =>
    createSession(tx, viewer.id, { ip: null, userAgent: "vitest" }),
  );
});

describe("authorization table (9.12 / 20.4)", () => {
  it("every session-guarded action rejects an unauthenticated caller", async () => {
    authState.token = null;
    const failures: string[] = [];
    for (const entry of TABLE) {
      const result = (await entry.action({})) as Result;
      if (result?.ok !== false || result.error?.code !== "UNAUTHENTICATED") {
        failures.push(`${entry.name} → ${JSON.stringify(result)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("a viewer is FORBIDDEN on every write action", async () => {
    authState.token = viewerToken;
    const failures: string[] = [];
    for (const entry of TABLE.filter((item) => item.viewerForbidden)) {
      const result = (await entry.action({})) as Result;
      if (result?.ok !== false || result.error?.code !== "FORBIDDEN") {
        failures.push(`${entry.name} → ${JSON.stringify(result)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("a viewer passes the permission gate on read actions (no FORBIDDEN)", async () => {
    authState.token = viewerToken;
    const failures: string[] = [];
    for (const entry of TABLE.filter((item) => !item.viewerForbidden)) {
      const result = (await entry.action({})) as Result;
      if (result?.ok === false && result.error?.code === "FORBIDDEN") {
        failures.push(`${entry.name} → FORBIDDEN`);
      }
      if (result?.ok === false && result.error?.code === "UNAUTHENTICATED") {
        failures.push(`${entry.name} → UNAUTHENTICATED`);
      }
    }
    expect(failures).toEqual([]);
  });
});
