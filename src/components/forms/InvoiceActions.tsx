"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { PAYMENT_METHODS, type CurrencyCode } from "@/lib/constants";
import { formatMoney, parseMajorToMinor } from "@/lib/money";
import {
  deleteDraftInvoiceAction,
  issueInvoiceAction,
  voidInvoiceAction,
} from "@/server/actions/invoices";
import {
  recordPaymentAction,
  voidPaymentAction,
} from "@/server/actions/payments";

export function InvoiceActions({
  invoiceId,
  status,
  number,
  currency,
  canWrite,
  canIssue,
  canVoid,
  canPay,
}: {
  invoiceId: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "void";
  number: string | null;
  currency: string;
  canWrite: boolean;
  canIssue: boolean;
  canVoid: boolean;
  canPay: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "void" | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  async function run(
    fn: () => Promise<{ ok: boolean; error?: { code: string } }>,
  ) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result.ok) return true;
    toast({
      title: t(`errors.${result.error?.code ?? "INTERNAL"}`),
      tone: "error",
    });
    return false;
  }

  async function onIssue() {
    if (await run(() => issueInvoiceAction({ id: invoiceId }))) {
      toast({ title: t("invoices.issued"), tone: "success" });
      router.refresh();
    }
  }

  async function onConfirm() {
    if (confirm === "delete") {
      const ok = await run(() => deleteDraftInvoiceAction({ id: invoiceId }));
      setConfirm(null);
      if (ok) {
        toast({ title: t("invoices.deleted"), tone: "success" });
        router.push("/invoices");
      }
      return;
    }
    const reason = window.prompt(t("invoices.voidReasonPrompt")) ?? "";
    if (!reason.trim()) {
      setConfirm(null);
      return;
    }
    const ok = await run(() =>
      voidInvoiceAction({ id: invoiceId, reason: reason.trim() }),
    );
    setConfirm(null);
    if (ok) {
      toast({ title: t("invoices.voided"), tone: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && canWrite ? (
          <>
            <a href={`/invoices/${invoiceId}/edit`}>
              <Button type="button" variant="secondary">
                {t("common.edit")}
              </Button>
            </a>
            {number === null ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirm("delete")}
              >
                {t("common.delete")}
              </Button>
            ) : null}
          </>
        ) : null}

        {status === "draft" && canIssue ? (
          <Button type="button" onClick={onIssue} loading={pending}>
            {t("invoices.issueAction")}
          </Button>
        ) : null}

        {(status === "issued" || status === "partially_paid") && canPay ? (
          <Button type="button" onClick={() => setPayOpen(true)}>
            {t("invoices.recordPayment")}
          </Button>
        ) : null}

        {status === "issued" && canVoid ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirm("void")}
          >
            {t("invoices.voidAction")}
          </Button>
        ) : null}
      </div>

      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        invoiceId={invoiceId}
        currency={currency}
        onDone={() => {
          setPayOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={onConfirm}
        title={t(
          confirm === "delete" ? "invoices.deleteTitle" : "invoices.voidTitle",
        )}
        message={t(
          confirm === "delete"
            ? "invoices.deleteMessage"
            : "invoices.voidMessage",
        )}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone="danger"
      />
    </>
  );
}

export function PaymentDialog({
  open,
  onClose,
  invoiceId,
  currency,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  currency: string;
  onDone: () => void;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFieldErrors({});
    let amountMinor = 0;
    try {
      amountMinor = parseMajorToMinor(
        String(data.get("amount") ?? ""),
        currency as CurrencyCode,
      );
    } catch {
      setPending(false);
      setFieldErrors({ amountMinor: "errors.invalid" });
      return;
    }
    const result = await recordPaymentAction({
      invoiceId,
      amountMinor,
      paidOn: String(data.get("paidOn") ?? ""),
      method: String(data.get("method") ?? "bank_transfer"),
      reference: String(data.get("reference") ?? ""),
      notes: String(data.get("notes") ?? ""),
    });
    setPending(false);
    if (result.ok) {
      toast({ title: t("invoices.paymentRecorded"), tone: "success" });
      onDone();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("invoices.recordPayment")}
      footer={null}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field
          label={t("invoices.amount", { currency })}
          htmlFor="pay-amount"
          error={fieldErrors.amountMinor ? t(fieldErrors.amountMinor) : null}
          required
        >
          <Input
            id="pay-amount"
            name="amount"
            dir="ltr"
            required
            className="text-start"
          />
        </Field>
        <Field label={t("invoices.paidOn")} htmlFor="pay-date" required>
          <Input
            id="pay-date"
            name="paidOn"
            type="date"
            defaultValue={today}
            max={today}
            required
            className="text-start"
          />
        </Field>
        <Field label={t("invoices.method")} htmlFor="pay-method">
          <Select id="pay-method" name="method" defaultValue="bank_transfer">
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t(`invoices.methods.${method}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("invoices.reference")} htmlFor="pay-ref">
          <Input
            id="pay-ref"
            name="reference"
            dir="ltr"
            className="text-start"
          />
        </Field>
        <Field label={t("invoices.notes")} htmlFor="pay-notes">
          <Textarea id="pay-notes" name="notes" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={pending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function VoidPaymentButton({
  paymentId,
  invoiceId,
  amountMinor,
  currency,
}: {
  paymentId: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    const reason = window.prompt(t("invoices.voidReasonPrompt")) ?? "";
    if (!reason.trim()) {
      setOpen(false);
      return;
    }
    setPending(true);
    const result = await voidPaymentAction({
      id: paymentId,
      invoiceId,
      reason: reason.trim(),
    });
    setPending(false);
    setOpen(false);
    if (result.ok) {
      toast({ title: t("invoices.paymentVoided"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-destructive hover:underline"
      >
        {t("invoices.voidPayment", {
          amount: formatMoney(amountMinor, currency as CurrencyCode, "en"),
        })}
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        title={t("invoices.voidPaymentTitle")}
        message={t("invoices.voidPaymentMessage")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone="danger"
      />
    </>
  );
}
