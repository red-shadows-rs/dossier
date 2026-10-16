"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Edit2,
  Landmark,
  Plus,
  Power,
  Star,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { BANK_PROVIDERS, type BankProviderId } from "@/lib/constants";
import type { BankAccount } from "@/lib/validation/settings";
import { updateBankAccountsAction } from "@/server/actions/settings";

function generateAccountId(): string {
  return "acc_" + Math.random().toString(36).substring(2, 10);
}

const PROVIDER_MAP = new Map(BANK_PROVIDERS.map((p) => [p.id, p]));

export function BankAccountsManager({
  initialAccounts,
  disabled,
}: {
  initialAccounts: BankAccount[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [pending, setPending] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form state
  const [provider, setProvider] = useState<BankProviderId>("alrajhi");
  const [bankNameAr, setBankNameAr] = useState("");
  const [bankNameEn, setBankNameEn] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [isActive, setIsActive] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);

  // Delete confirm state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(id: string, text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "تم نسخ الحساب إلى الحافظة", tone: "success" });
  }

  function openCreateDialog() {
    setEditingAccount(null);
    const defaultProv = PROVIDER_MAP.get("alrajhi") ?? BANK_PROVIDERS[0];
    setProvider("alrajhi");
    setBankNameAr(defaultProv.nameAr);
    setBankNameEn(defaultProv.nameEn);
    setAccountHolder("");
    setIban("");
    setSwift("");
    setCurrency("SAR");
    setIsActive(true);
    setIsPrimary(accounts.length === 0);
    setIsDialogOpen(true);
  }

  function openEditDialog(acc: BankAccount) {
    setEditingAccount(acc);
    const validProvider = PROVIDER_MAP.has(acc.provider as BankProviderId)
      ? (acc.provider as BankProviderId)
      : "other";
    setProvider(validProvider);
    setBankNameAr(acc.bankNameAr);
    setBankNameEn(acc.bankNameEn);
    setAccountHolder(acc.accountHolder);
    setIban(acc.iban);
    setSwift(acc.swift ?? "");
    setCurrency(acc.currency || "SAR");
    setIsActive(acc.isActive);
    setIsPrimary(acc.isPrimary);
    setIsDialogOpen(true);
  }

  function handleSelectProvider(provId: BankProviderId) {
    setProvider(provId);
    const p = PROVIDER_MAP.get(provId);
    if (p && provId !== "other") {
      setBankNameAr(p.nameAr);
      setBankNameEn(p.nameEn);
      if (provId === "binance") {
        setCurrency("USDT");
      } else if (provId === "paypal") {
        setCurrency("USD");
      } else {
        setCurrency("SAR");
      }
    }
  }

  async function saveAccounts(nextAccounts: BankAccount[]) {
    setPending(true);
    const result = await updateBankAccountsAction(nextAccounts);
    setPending(false);
    if (result.ok) {
      setAccounts(nextAccounts);
      toast({ title: "تم حفظ بيانات الحسابات بنجاح", tone: "success" });
      router.refresh();
      return true;
    }
    toast({ title: "حدث خطأ أثناء الحفظ", tone: "error" });
    return false;
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!iban.trim()) {
      toast({ title: "يرجى إدخال رقم الحساب أو الآيبان", tone: "error" });
      return;
    }

    const currentProviderDef = PROVIDER_MAP.get(provider);
    const finalBankNameAr = bankNameAr.trim() || currentProviderDef?.nameAr || "حساب بنكي";
    const finalBankNameEn = bankNameEn.trim() || currentProviderDef?.nameEn || "Bank Account";

    const updatedAccount: BankAccount = {
      id: editingAccount ? editingAccount.id : generateAccountId(),
      provider,
      bankNameAr: finalBankNameAr,
      bankNameEn: finalBankNameEn,
      accountHolder: accountHolder.trim(),
      iban: iban.trim(),
      swift: swift.trim(),
      currency: currency.trim() || "SAR",
      isActive,
      isPrimary,
    };

    let nextAccounts: BankAccount[];
    if (editingAccount) {
      nextAccounts = accounts.map((a) => (a.id === editingAccount.id ? updatedAccount : a));
    } else {
      nextAccounts = [...accounts, updatedAccount];
    }

    // If marked primary, unset other primaries
    if (updatedAccount.isPrimary) {
      nextAccounts = nextAccounts.map((a) =>
        a.id === updatedAccount.id ? a : { ...a, isPrimary: false },
      );
    } else if (!nextAccounts.some((a) => a.isPrimary) && nextAccounts.length > 0) {
      nextAccounts[0].isPrimary = true;
    }

    const ok = await saveAccounts(nextAccounts);
    if (ok) {
      setIsDialogOpen(false);
    }
  }

  async function handleTogglePrimary(accId: string) {
    if (disabled || pending) return;
    const nextAccounts = accounts.map((a) => ({
      ...a,
      isPrimary: a.id === accId,
    }));
    await saveAccounts(nextAccounts);
  }

  async function handleToggleActive(accId: string) {
    if (disabled || pending) return;
    const nextAccounts = accounts.map((a) =>
      a.id === accId ? { ...a, isActive: !a.isActive } : a,
    );
    await saveAccounts(nextAccounts);
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId || disabled || pending) return;
    const nextAccounts = accounts.filter((a) => a.id !== deleteTargetId);
    if (nextAccounts.length > 0 && !nextAccounts.some((a) => a.isPrimary)) {
      nextAccounts[0].isPrimary = true;
    }
    const ok = await saveAccounts(nextAccounts);
    if (ok) {
      setDeleteTargetId(null);
    }
  }

  const selectedProviderDef = PROVIDER_MAP.get(provider) ?? PROVIDER_MAP.get("other") ?? BANK_PROVIDERS[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="inline-flex items-center gap-2.5">
          <Landmark size={18} className="text-primary shrink-0" aria-hidden="true" />
          <span>الحسابات البنكية ووسائل الدفع</span>
        </CardTitle>

        <Button
          type="button"
          size="sm"
          onClick={openCreateDialog}
          disabled={disabled || pending}
          className="gap-1.5"
        >
          <Plus size={15} aria-hidden="true" />
          <span>إضافة حساب</span>
        </Button>
      </CardHeader>

      <CardContent>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <Landmark size={24} aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              لم تتم إضافة أي حسابات بنكية بعد
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mb-4">
              أضف حساباتك البنكية المعتمدة لتظهر تلقائيا في تعليمات الدفع وفواتير المبيعات.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCreateDialog}
              disabled={disabled || pending}
              className="gap-1.5"
            >
              <Plus size={15} aria-hidden="true" />
              <span>إضافة حسابك الأول</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {accounts.map((acc) => {
              const prov = PROVIDER_MAP.get(acc.provider as BankProviderId) ?? PROVIDER_MAP.get("other") ?? BANK_PROVIDERS[0];
              const isCopied = copiedId === acc.id;

              return (
                <div
                  key={acc.id}
                  className={clsx(
                    "relative flex flex-col justify-between rounded-xl border p-4 transition-all bg-card/60",
                    acc.isPrimary
                      ? "border-primary/50 shadow-xs ring-1 ring-primary/20"
                      : "border-border/80 hover:border-border",
                    !acc.isActive && "opacity-60 bg-muted/20",
                  )}
                >
                  <div>
                    {/* Header: Provider Icon & Name & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-border/60 p-1.5 shadow-2xs overflow-hidden"
                          style={{
                            background: prov.id === "barq" ? "#000000" : "#ffffff",
                          }}
                        >
                          {prov.icon ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={prov.icon}
                              alt={prov.nameAr}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <Landmark size={20} className="text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {acc.bankNameAr || prov.nameAr}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate" dir="ltr">
                            {acc.bankNameEn || prov.nameEn}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {acc.isPrimary ? (
                          <Badge tone="red" dot={false} className="gap-1 px-2.5 py-0.5 text-[11px] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Star size={11} className="fill-rose-500 text-rose-500 shrink-0" />
                              <span>رئيسي</span>
                            </span>
                          </Badge>
                        ) : null}

                        <Badge
                          tone={acc.isActive ? "green" : "gray"}
                          className="px-2.5 py-0.5 text-[11px] whitespace-nowrap"
                        >
                          {acc.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-1.5 py-2.5 border-y border-border/50 text-xs">
                      {acc.accountHolder ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">المستفيد:</span>
                          <span className="font-medium text-foreground truncate">
                            {acc.accountHolder}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {prov.identifierLabelAr}:
                        </span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="font-mono text-[11px] font-semibold text-foreground truncate select-all"
                            dir="ltr"
                          >
                            {acc.iban}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.id, acc.iban)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                            title="نسخ"
                          >
                            {isCopied ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>

                      {acc.swift ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">السويفت:</span>
                          <span className="font-mono text-[11px] text-foreground" dir="ltr">
                            {acc.swift}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-muted-foreground shrink-0">العملة:</span>
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          {acc.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 mt-1">
                    <div className="flex items-center gap-1">
                      {!acc.isPrimary ? (
                        <button
                          type="button"
                          disabled={disabled || pending}
                          onClick={() => handleTogglePrimary(acc.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted"
                          title="تعيين كحساب رئيسي"
                        >
                          <Star size={13} />
                          <span>رئيسي</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        disabled={disabled || pending}
                        onClick={() => handleToggleActive(acc.id)}
                        className={clsx(
                          "inline-flex items-center gap-1 text-[11px] transition-colors p-1 rounded hover:bg-muted",
                          acc.isActive
                            ? "text-muted-foreground hover:text-amber-500"
                            : "text-muted-foreground hover:text-emerald-500",
                        )}
                        title={acc.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                      >
                        <Power size={13} />
                        <span>{acc.isActive ? "تعطيل" : "تفعيل"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={disabled || pending}
                        onClick={() => openEditDialog(acc)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                        title="تعديل الحساب"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        disabled={disabled || pending}
                        onClick={() => setDeleteTargetId(acc.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                        title="حذف الحساب"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add / Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingAccount ? "تعديل بيانات الحساب" : "إضافة حساب أو وسيلة دفع"}
        maxWidth="md"
        footer={null}
      >
        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="flex flex-col gap-4 py-1"
        >
          {/* Provider Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-foreground/90 select-none">
              اختر البنك أو وسيلة الدفع
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {BANK_PROVIDERS.filter((p) => p.id !== "other").map((p) => {
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p.id)}
                    className={clsx(
                      "flex items-center gap-2.5 p-2 rounded-lg border text-start transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                        : "border-border/80 hover:border-border hover:bg-muted/40 text-foreground",
                    )}
                  >
                    <div
                      className="flex h-7 w-9 shrink-0 items-center justify-center rounded border border-border/40 p-1 overflow-hidden shadow-2xs"
                      style={{ background: p.id === "barq" ? "#000000" : "#ffffff" }}
                    >
                      {p.icon ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.icon}
                          alt={p.nameAr}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Landmark size={14} className="text-primary" />
                      )}
                    </div>
                    <span className="text-xs font-medium leading-tight">{p.nameAr}</span>
                  </button>
                );
              })}
            </div>

            {/* Other / Custom account option */}
            {(() => {
              const otherProv = PROVIDER_MAP.get("other");
              if (!otherProv) return null;
              const isSelected = provider === "other";
              return (
                <button
                  type="button"
                  onClick={() => handleSelectProvider("other")}
                  className={clsx(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-all cursor-pointer select-none text-xs",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                      : "border-dashed border-border/80 hover:border-border hover:bg-muted/30 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Landmark size={14} className="shrink-0" />
                  <span>حساب بنكي آخر أو مخصص</span>
                </button>
              );
            })()}
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم البنك / الجهة (عربي)" htmlFor="acc-bank-name-ar" required>
              <Input
                id="acc-bank-name-ar"
                value={bankNameAr}
                onChange={(e) => setBankNameAr(e.target.value)}
                placeholder={selectedProviderDef.nameAr}
                dir="rtl"
                required
              />
            </Field>

            <Field label="اسم البنك / الجهة (إنجليزي)" htmlFor="acc-bank-name-en">
              <Input
                id="acc-bank-name-en"
                value={bankNameEn}
                onChange={(e) => setBankNameEn(e.target.value)}
                placeholder={selectedProviderDef.nameEn}
                dir="ltr"
                className="text-start"
              />
            </Field>
          </div>

          {/* Account Holder */}
          <Field label="اسم صاحب الحساب / المستفيد" htmlFor="acc-holder">
            <Input
              id="acc-holder"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="اسم المنشأة أو المستفيد كما هو مسجل في البنك"
            />
          </Field>

          {/* Identifier (IBAN / Account / Wallet / Email) */}
          <Field label={selectedProviderDef.identifierLabelAr} htmlFor="acc-iban" required>
            <Input
              id="acc-iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder={selectedProviderDef.placeholder}
              dir="ltr"
              className="font-mono text-xs text-start"
              required
            />
          </Field>

          {/* Swift & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="رمز السويفت (SWIFT)" htmlFor="acc-swift">
              <Input
                id="acc-swift"
                value={swift}
                onChange={(e) => setSwift(e.target.value.toUpperCase())}
                placeholder="RJHISARI"
                dir="ltr"
                className="font-mono text-xs uppercase text-start"
              />
            </Field>

            <Field label="العملة" htmlFor="acc-currency" required>
              <Input
                id="acc-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="SAR"
                dir="ltr"
                className="font-mono text-xs uppercase text-start"
                required
              />
            </Field>
          </div>

          {/* Checkbox Options styled cleanly as cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex h-11 cursor-pointer items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-3.5 text-xs text-foreground transition-colors hover:bg-muted/30 select-none">
              <span className="font-medium">حساب نشط (يظهر في تعليمات الدفع)</span>
              <Checkbox
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                sx={{ p: 0.5 }}
              />
            </label>

            <label className="flex h-11 cursor-pointer items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-3.5 text-xs text-foreground transition-colors hover:bg-muted/30 select-none">
              <span className="font-medium">تعيين كحساب رئيسي</span>
              <Checkbox
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                sx={{ p: 0.5 }}
              />
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-4 mt-2 border-t border-border/60">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDialogOpen(false)}
              disabled={pending}
              className="gap-2"
            >
              <X size={15} aria-hidden="true" />
              <span>إلغاء</span>
            </Button>
            <Button
              type="submit"
              loading={pending}
              className="gap-2"
            >
              <Check size={15} aria-hidden="true" />
              <span>حفظ</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="حذف الحساب"
        message="هل أنت متأكد من رغبتك في حذف هذا الحساب؟ لن يظهر مجددا في تعليمات الدفع."
        confirmLabel="حذف الحساب"
        cancelLabel="إلغاء"
        pending={pending}
      />
    </Card>
  );
}
