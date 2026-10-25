// Dossier - Invoice Actions Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Ban,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Pencil,
  Receipt,
  Send,
  Trash2,
  X,
} from "lucide-react";
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
  duplicateInvoiceAction,
  issueInvoiceAction,
  sendInvoiceEmailAction,
  sendReceiptEmailAction,
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
  hasPayments,
}: {
  invoiceId: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "void";
  number: string | null;
  currency: string;
  canWrite: boolean;
  canIssue: boolean;
  canVoid: boolean;
  canPay: boolean;
  hasPayments?: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
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

  async function onSendEmail() {
    if (await run(() => sendInvoiceEmailAction({ id: invoiceId }))) {
      toast({ title: t("invoices.emailQueued"), tone: "success" });
      router.refresh();
    }
  }

  async function onSendReceiptEmail() {
    if (await run(() => sendReceiptEmailAction({ id: invoiceId }))) {
      toast({ title: t("invoices.receiptEmailQueued"), tone: "success" });
      router.refresh();
    }
  }

  async function onDeleteConfirm() {
    const ok = await run(() => deleteDraftInvoiceAction({ id: invoiceId }));
    setConfirmDelete(false);
    if (ok) {
      toast({ title: t("invoices.deleted"), tone: "success" });
      router.push("/invoices");
    }
  }

  async function onVoidSubmit() {
    if (!voidReason.trim()) return;
    const ok = await run(() =>
      voidInvoiceAction({ id: invoiceId, reason: voidReason.trim() }),
    );
    if (ok) {
      setVoidOpen(false);
      setVoidReason("");
      toast({ title: t("invoices.voided"), tone: "success" });
      router.refresh();
    }
  }

  async function onDuplicate() {
    setPending(true);
    const result = await duplicateInvoiceAction({ id: invoiceId });
    setPending(false);
    setConfirmDuplicate(false);
    if (result.ok) {
      toast({ title: t("invoices.duplicatedToast"), tone: "success" });
      router.push(`/invoices/${result.data.id}/edit`);
      return;
    }
    toast({
      title: t(`errors.${result.error?.code ?? "INTERNAL"}`),
      tone: "error",
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && canWrite ? (
          <>
            <a href={`/invoices/${invoiceId}/edit`}>
              <Button type="button" variant="secondary" className="gap-2">
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </Button>
            </a>
            {number === null ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmDelete(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            ) : null}
          </>
        ) : null}

        {status === "draft" && canIssue ? (
          <Button type="button" onClick={onIssue} loading={pending} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {t("invoices.issueAction")}
          </Button>
        ) : null}

        {(status === "issued" ||
          status === "partially_paid" ||
          status === "paid") &&
        canIssue ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onSendEmail}
            loading={pending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {t("invoices.sendEmail")}
          </Button>
        ) : null}

        {hasPayments && canIssue ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onSendReceiptEmail}
            loading={pending}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            {t("invoices.sendReceiptEmail")}
          </Button>
        ) : null}

        {(status === "issued" || status === "partially_paid") && canPay ? (
          <Button type="button" onClick={() => setPayOpen(true)} className="gap-2">
            <CreditCard className="h-4 w-4" />
            {t("invoices.recordPayment")}
          </Button>
        ) : null}

        {status === "issued" && canVoid ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setVoidOpen(true)}
            className="gap-2"
          >
            <Ban className="h-4 w-4" />
            {t("invoices.voidAction")}
          </Button>
        ) : null}

        {canWrite ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmDuplicate(true)}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {t("invoices.duplicate")}
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
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDeleteConfirm}
        title={t("invoices.deleteTitle")}
        message={t("invoices.deleteMessage")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone="danger"
      />

      <ConfirmDialog
        open={confirmDuplicate}
        onClose={() => setConfirmDuplicate(false)}
        onConfirm={onDuplicate}
        title={t("invoices.duplicate")}
        message={t("invoices.duplicateConfirm")}
        confirmLabel={t("invoices.duplicate")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone="primary"
      />

      <Dialog
        open={voidOpen}
        onClose={() => {
          setVoidOpen(false);
          setVoidReason("");
        }}
        title={t("invoices.voidTitle")}
        description={t("invoices.voidMessage")}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setVoidOpen(false);
                setVoidReason("");
              }}
              disabled={pending}
              className="gap-1.5"
            >
              <X size={15} aria-hidden="true" />
              <span>{t("common.cancel")}</span>
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onVoidSubmit}
              loading={pending}
              disabled={!voidReason.trim()}
              className="gap-1.5"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>{t("invoices.voidConfirm")}</span>
            </Button>
          </>
        }
      >
        <div className="pt-2">
          <Field
            label={t("invoices.voidReasonPrompt")}
            htmlFor="void-invoice-reason"
            required
          >
            <Input
              id="void-invoice-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={t("invoices.placeholders.voidReason")}
              autoFocus
            />
          </Field>
        </div>
      </Dialog>
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
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFieldErrors({});
    setStatusError(null);
    let amountMinor = 0;
    try {
      amountMinor = parseMajorToMinor(
        String(data.get("amount") ?? ""),
        currency as CurrencyCode,
      );
    } catch {
      setPending(false);
      setFieldErrors({ amountMinor: "errors.invalid" });
      setStatusError(t("errors.invalid"));
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
    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("invoices.recordPayment")}
      footer={null}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        {statusError ? (
          <p
            role="alert"
            className="rounded border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
          >
            {statusError}
          </p>
        ) : null}
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
            placeholder={t("invoices.placeholders.paymentAmount")}
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
            placeholder={t("invoices.placeholders.paymentReference")}
            className="text-start"
          />
        </Field>
        <Field label={t("invoices.notes")} htmlFor="pay-notes">
          <Textarea
            id="pay-notes"
            name="notes"
            placeholder={t("invoices.placeholders.paymentNotes")}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={pending} className="gap-2">
            <Check className="h-4 w-4" />
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
  const [reason, setReason] = useState("");

  async function onVoidSubmit() {
    if (!reason.trim()) return;
    setPending(true);
    const result = await voidPaymentAction({
      id: paymentId,
      invoiceId,
      reason: reason.trim(),
    });
    setPending(false);
    if (result.ok) {
      setOpen(false);
      setReason("");
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
        className="inline-flex items-center gap-1.5 text-sm text-destructive hover:opacity-80 transition-opacity"
      >
        <Ban className="h-3.5 w-3.5" />
        {t("invoices.voidPayment", {
          amount: formatMoney(amountMinor, currency as CurrencyCode, "en"),
        })}
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setReason("");
        }}
        title={t("invoices.voidPaymentTitle")}
        description={t("invoices.voidPaymentMessage")}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
              disabled={pending}
              className="gap-1.5"
            >
              <X size={15} aria-hidden="true" />
              <span>{t("common.cancel")}</span>
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onVoidSubmit}
              loading={pending}
              disabled={!reason.trim()}
              className="gap-1.5"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>{t("common.confirm")}</span>
            </Button>
          </>
        }
      >
        <div className="pt-2">
          <Field
            label={t("invoices.voidReasonPrompt")}
            htmlFor={`void-payment-reason-${paymentId}`}
            required
          >
            <Input
              id={`void-payment-reason-${paymentId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("invoices.placeholders.voidReason")}
              autoFocus
            />
          </Field>
        </div>
      </Dialog>
    </>
  );
}
