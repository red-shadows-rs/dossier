// Dossier - Bank Accounts Manager Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  Copy,
  Edit2,
  ExternalLink,
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
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  BANK_PROVIDERS,
  CRYPTO_NETWORKS,
  SUPPORTED_CURRENCIES,
  type BankProviderId,
} from "@/lib/constants";
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
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = useTranslations("settings.bankAccounts");
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [pending, setPending] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [provider, setProvider] = useState<BankProviderId>("alrajhi");
  const [bankNameAr, setBankNameAr] = useState("");
  const [bankNameEn, setBankNameEn] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [isActive, setIsActive] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);
  const [username, setUsername] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [binanceUid, setBinanceUid] = useState("");
  const [network, setNetwork] = useState("TRC20");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(id: string, text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: t("copied"), tone: "success" });
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
    setUsername("");
    setPaymentUrl("");
    setBinanceUid("");
    setNetwork("TRC20");
    setIsActive(true);
    setIsPrimary(accounts.length === 0);
    setIsDialogOpen(true);
  }

  function openEditDialog(acc: BankAccount) {
    setEditingAccount(acc);
    const validProvider = PROVIDER_MAP.has(acc.provider as BankProviderId)
      ? (acc.provider as BankProviderId)
      : "other";
    const provDef = PROVIDER_MAP.get(validProvider);
    const isBank = provDef?.type === "bank" || provDef?.type === "custom";
    setProvider(validProvider);
    setBankNameAr(acc.bankNameAr);
    setBankNameEn(acc.bankNameEn);
    setAccountHolder(acc.accountHolder);
    setIban(acc.iban);
    setSwift(isBank ? (acc.swift ?? "") : "");
    setCurrency(acc.currency || "SAR");
    setUsername(acc.username ?? "");
    setPaymentUrl(acc.paymentUrl ?? "");
    setBinanceUid(acc.binanceUid ?? "");
    setNetwork(acc.network ?? "TRC20");
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
        setSwift("");
        setNetwork("TRC20");
      } else if (provId === "paypal") {
        setCurrency("USD");
        setSwift("");
      } else if (provId === "barq" || provId === "stcpay") {
        setCurrency("SAR");
        setSwift("");
      } else if (provId === "alrajhi") {
        setCurrency("SAR");
        setSwift(p.swiftPlaceholder ?? "RJHISARI");
      } else if (provId === "snb") {
        setCurrency("SAR");
        setSwift(p.swiftPlaceholder ?? "NCBKSARI");
      } else {
        setCurrency("SAR");
        setSwift("");
      }
    } else if (provId === "other") {
      setBankNameAr("");
      setBankNameEn("");
      setCurrency("SAR");
      setSwift("");
    }
  }

  async function saveAccounts(nextAccounts: BankAccount[]) {
    setPending(true);
    const result = await updateBankAccountsAction(nextAccounts);
    setPending(false);
    if (result.ok) {
      setAccounts(nextAccounts);
      toast({ title: t("saved"), tone: "success" });
      router.refresh();
      return true;
    }
    toast({ title: t("saveError"), tone: "error" });
    return false;
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (provider === "binance") {
      if (!binanceUid.trim() && !iban.trim() && !username.trim()) {
        toast({
          title: isAr
            ? "يرجى إدخال معرف باينانس (UID) أو اسم المستخدم أو عنوان المحفظة"
            : "Please provide Binance UID, Username, or Wallet Address",
          tone: "error",
        });
        return;
      }
    } else if (provider === "paypal") {
      if (!iban.trim() && !paymentUrl.trim() && !username.trim()) {
        toast({
          title: isAr
            ? "يرجى إدخال البريد الإلكتروني أو اسم المستخدم أو رابط PayPal"
            : "Please provide PayPal email, username, or payment link",
          tone: "error",
        });
        return;
      }
    } else {
      if (!iban.trim()) {
        toast({ title: t("ibanRequired"), tone: "error" });
        return;
      }
    }

    const currentProviderDef = PROVIDER_MAP.get(provider) ?? PROVIDER_MAP.get("other") ?? BANK_PROVIDERS[0];
    const isBankType = currentProviderDef.type === "bank" || currentProviderDef.type === "custom";
    const finalBankNameAr = bankNameAr.trim() || currentProviderDef?.nameAr || "حساب بنكي";
    const finalBankNameEn = bankNameEn.trim() || currentProviderDef?.nameEn || "Bank Account";

    const defaultCurrency = provider === "binance" ? "USDT" : provider === "paypal" ? "USD" : "SAR";

    const finalIban =
      iban.trim() ||
      (provider === "binance"
        ? (binanceUid.trim() || username.trim())
        : (username.trim() || paymentUrl.trim()));

    const updatedAccount: BankAccount = {
      id: editingAccount ? editingAccount.id : generateAccountId(),
      provider,
      bankNameAr: finalBankNameAr,
      bankNameEn: finalBankNameEn,
      accountHolder: accountHolder.trim(),
      iban: finalIban,
      swift: isBankType ? swift.trim() : "",
      currency: currency.trim() || defaultCurrency,
      isActive,
      isPrimary,
      username: username.trim(),
      paymentUrl: paymentUrl.trim(),
      binanceUid: binanceUid.trim(),
      network: provider === "binance" ? network : "",
    };

    let nextAccounts: BankAccount[];
    if (editingAccount) {
      nextAccounts = accounts.map((a) => (a.id === editingAccount.id ? updatedAccount : a));
    } else {
      nextAccounts = [...accounts, updatedAccount];
    }

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
  const isBankType = selectedProviderDef.type === "bank" || selectedProviderDef.type === "custom";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="inline-flex items-center gap-2.5">
          <Landmark size={18} className="text-primary shrink-0" aria-hidden="true" />
          <span>{t("title")}</span>
        </CardTitle>

        <Button
          type="button"
          size="sm"
          onClick={openCreateDialog}
          disabled={disabled || pending}
          className="gap-1.5"
        >
          <Plus size={15} aria-hidden="true" />
          <span>{t("add")}</span>
        </Button>
      </CardHeader>

      <CardContent>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <Landmark size={24} aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              {t("emptyTitle")}
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mb-4">
              {t("emptyDesc")}
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
              <span>{t("addNew")}</span>
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
                    "relative flex flex-col justify-between rounded-lg border p-4 transition-all bg-card/60",
                    acc.isPrimary
                      ? "border-primary/50 shadow-xs ring-1 ring-primary/20"
                      : "border-border/80 hover:border-border",
                    !acc.isActive && "opacity-60 bg-muted/20",
                  )}
                >
                  <div>
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
                              alt={isAr ? prov.nameAr : prov.nameEn}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <Landmark size={20} className="text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {isAr ? (acc.bankNameAr || prov.nameAr) : (acc.bankNameEn || prov.nameEn || acc.bankNameAr)}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate" dir="ltr">
                            {isAr ? (acc.bankNameEn || prov.nameEn) : (acc.bankNameAr || prov.nameAr)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {acc.isPrimary ? (
                          <Badge tone="red" dot={false} className="gap-1 px-2.5 py-0.5 text-[11px] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Star size={11} className="fill-rose-500 text-rose-500 shrink-0" />
                              <span>{t("primary")}</span>
                            </span>
                          </Badge>
                        ) : null}

                        <Badge
                          tone={acc.isActive ? "green" : "gray"}
                          className="px-2.5 py-0.5 text-[11px] whitespace-nowrap"
                        >
                          {acc.isActive ? t("active") : t("inactive")}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5 py-2.5 border-y border-border/50 text-xs">
                      {acc.accountHolder ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">
                            {isAr
                              ? (prov.type === "bank" || prov.type === "custom"
                                  ? t("beneficiary")
                                  : "صاحب الحساب")
                              : (prov.type === "bank" || prov.type === "custom"
                                  ? t("beneficiary")
                                  : "Account Holder")}
                            :
                          </span>
                          <span className="font-medium text-foreground truncate">
                            {acc.accountHolder}
                          </span>
                        </div>
                      ) : null}

                      {acc.provider === "binance" ? (
                        <>
                          {acc.binanceUid ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {isAr ? "معرف باينانس (UID):" : "Binance UID:"}
                              </span>
                              <div className="flex items-center gap-1 min-w-0">
                                <span
                                  className="font-mono text-[11px] font-semibold text-foreground truncate select-all"
                                  dir="ltr"
                                >
                                  {acc.binanceUid}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(acc.id + "-uid", acc.binanceUid ?? "")}
                                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                  title={t("copy")}
                                >
                                  {copiedId === acc.id + "-uid" ? (
                                    <Check size={12} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {acc.username ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {isAr ? "اسم المستخدم:" : "Username:"}
                              </span>
                              <span className="font-mono text-[11px] text-foreground truncate" dir="ltr">
                                {acc.username.startsWith("@") ? acc.username : `@${acc.username}`}
                              </span>
                            </div>
                          ) : null}

                          {acc.iban && acc.iban !== acc.binanceUid ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {acc.network
                                  ? (isAr ? `المحفظة (${acc.network}):` : `Wallet (${acc.network}):`)
                                  : (isAr ? "عنوان المحفظة:" : "Wallet Address:")}
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
                                  onClick={() => handleCopy(acc.id + "-wallet", acc.iban)}
                                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                  title={t("copy")}
                                >
                                  {copiedId === acc.id + "-wallet" ? (
                                    <Check size={12} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : acc.provider === "paypal" ? (
                        <>
                          {acc.iban ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {isAr ? "البريد الإلكتروني:" : "Email:"}
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
                                  onClick={() => handleCopy(acc.id + "-email", acc.iban)}
                                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                  title={t("copy")}
                                >
                                  {copiedId === acc.id + "-email" ? (
                                    <Check size={12} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {acc.username ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {isAr ? "اسم المستخدم:" : "Username:"}
                              </span>
                              <span className="font-mono text-[11px] text-foreground truncate" dir="ltr">
                                {acc.username.startsWith("@") ? acc.username : `@${acc.username}`}
                              </span>
                            </div>
                          ) : null}

                          {acc.paymentUrl ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {isAr ? "رابط الدفع:" : "Payment Link:"}
                              </span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <a
                                  href={
                                    acc.paymentUrl.startsWith("http://") || acc.paymentUrl.startsWith("https://")
                                      ? acc.paymentUrl
                                      : `https://${acc.paymentUrl}`
                                  }
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono truncate"
                                  dir="ltr"
                                >
                                  <span className="truncate">{acc.paymentUrl}</span>
                                  <ExternalLink size={11} className="shrink-0" />
                                </a>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground shrink-0">
                              {isAr ? prov.identifierLabelAr : prov.identifierLabelEn}:
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
                                title={t("copy")}
                              >
                                {isCopied ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>

                          {(prov.type === "bank" || prov.type === "custom") && acc.swift ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">{t("swift")}:</span>
                              <span className="font-mono text-[11px] text-foreground" dir="ltr">
                                {acc.swift}
                              </span>
                            </div>
                          ) : null}
                        </>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-muted-foreground shrink-0">{t("currency")}:</span>
                        <span className="font-mono text-[11px] font-bold text-foreground flex items-center gap-1">
                          <span className="text-muted-foreground font-normal">
                            {SUPPORTED_CURRENCIES.find((c) => c.code === acc.currency)?.symbol ?? ""}
                          </span>
                          <span>{acc.currency}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-1">
                    <div className="flex items-center gap-1">
                      {!acc.isPrimary ? (
                        <button
                          type="button"
                          disabled={disabled || pending}
                          onClick={() => handleTogglePrimary(acc.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted"
                          title={t("setPrimary")}
                        >
                          <Star size={13} />
                          <span>{t("primary")}</span>
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
                        title={acc.isActive ? t("deactivate") : t("activate")}
                      >
                        <Power size={13} />
                        <span>{acc.isActive ? t("deactivate") : t("activate")}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={disabled || pending}
                        onClick={() => openEditDialog(acc)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                        title={t("edit")}
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        disabled={disabled || pending}
                        onClick={() => setDeleteTargetId(acc.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                        title={t("delete")}
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

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingAccount ? t("editDialogTitle") : t("addDialogTitle")}
        maxWidth="md"
        footer={null}
      >
        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="flex flex-col gap-4 py-1"
        >
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-foreground/90 select-none">
              {t("chooseProvider")}
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
                          alt={isAr ? p.nameAr : p.nameEn}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Landmark size={14} className="text-primary" />
                      )}
                    </div>
                    <span className="text-xs font-medium leading-tight">{isAr ? p.nameAr : p.nameEn}</span>
                  </button>
                );
              })}
            </div>

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
                  <span>{t("otherProvider")}</span>
                </button>
              );
            })()}
          </div>

          {provider === "binance" ? (
            <>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground flex flex-col gap-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Landmark size={14} className="text-amber-500" />
                  <span>{isAr ? "خيارات التحويل عبر باينانس" : "Binance Transfer Options"}</span>
                </span>
                <span>{t("binanceInfo")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("binanceUidLabel")} htmlFor="acc-binance-uid">
                  <Input
                    id="acc-binance-uid"
                    value={binanceUid}
                    onChange={(e) => setBinanceUid(e.target.value.trim())}
                    placeholder={t("binanceUidPlaceholder")}
                    dir="ltr"
                    className="font-mono text-xs text-start"
                  />
                </Field>

                <Field label={t("binanceUsernameLabel")} htmlFor="acc-username">
                  <Input
                    id="acc-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    placeholder={t("binanceUsernamePlaceholder")}
                    dir="ltr"
                    className="text-start"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("currencyLabel")} htmlFor="acc-currency" required>
                  <Select
                    id="acc-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} - {isAr ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                    {currency &&
                    !SUPPORTED_CURRENCIES.some((c) => c.code === currency) ? (
                      <option value={currency}>{currency}</option>
                    ) : null}
                  </Select>
                </Field>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5 space-y-3">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>
                    {isAr
                      ? "عنوان المحفظة وشبكة الإيداع (اختياري)"
                      : "Deposit Wallet Address & Network (Optional)"}
                  </span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <Field label={t("networkLabel")} htmlFor="acc-network">
                      <Select
                        id="acc-network"
                        value={network}
                        onChange={(e) => setNetwork(e.target.value)}
                      >
                        {CRYPTO_NETWORKS.map((net) => (
                          <option key={net.id} value={net.id}>
                            {net.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label={t("walletAddressLabel")} htmlFor="acc-iban">
                      <Input
                        id="acc-iban"
                        value={iban}
                        onChange={(e) => setIban(e.target.value.trim())}
                        placeholder={t("walletAddressPlaceholder")}
                        dir="ltr"
                        className="font-mono text-xs text-start"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <Field
                label={
                  isAr
                    ? "اسم الحساب أو اللقب التعريفي (اختياري)"
                    : "Account Name / Nickname (Optional)"
                }
                htmlFor="acc-holder"
              >
                <Input
                  id="acc-holder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder={
                    isAr
                      ? "الاسم المسجل في باينانس أو المعرف"
                      : "Binance account name or handle"
                  }
                />
              </Field>
            </>
          ) : provider === "paypal" ? (
            <>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground flex flex-col gap-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Landmark size={14} className="text-blue-500" />
                  <span>{isAr ? "خيارات التحويل عبر PayPal" : "PayPal Transfer Options"}</span>
                </span>
                <span>{t("paypalInfo")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("paypalEmailLabel")} htmlFor="acc-iban" required>
                  <Input
                    id="acc-iban"
                    type="email"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.trim())}
                    placeholder={t("paypalEmailPlaceholder")}
                    dir="ltr"
                    className="font-mono text-xs text-start"
                    required
                  />
                </Field>

                <Field label={t("paypalUsernameLabel")} htmlFor="acc-username">
                  <Input
                    id="acc-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    placeholder={t("paypalUsernamePlaceholder")}
                    dir="ltr"
                    className="text-start"
                  />
                </Field>
              </div>

              <Field label={t("paypalUrlLabel")} htmlFor="acc-payment-url">
                <Input
                  id="acc-payment-url"
                  type="url"
                  value={paymentUrl}
                  onChange={(e) => setPaymentUrl(e.target.value.trim())}
                  placeholder={t("paypalUrlPlaceholder")}
                  dir="ltr"
                  className="font-mono text-xs text-start"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label={
                    isAr
                      ? "اسم صاحب الحساب أو المنشأة (اختياري)"
                      : "Account Holder / Business Name (Optional)"
                  }
                  htmlFor="acc-holder"
                >
                  <Input
                    id="acc-holder"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder={
                      isAr
                        ? "الاسم المسجل في حساب بايبال"
                        : "Name registered on PayPal"
                    }
                  />
                </Field>

                <Field label={t("currencyLabel")} htmlFor="acc-currency" required>
                  <Select
                    id="acc-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} - {isAr ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                    {currency &&
                    !SUPPORTED_CURRENCIES.some((c) => c.code === currency) ? (
                      <option value={currency}>{currency}</option>
                    ) : null}
                  </Select>
                </Field>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("bankNameAr")} htmlFor="acc-bank-name-ar" required>
                  <Input
                    id="acc-bank-name-ar"
                    value={bankNameAr}
                    onChange={(e) => setBankNameAr(e.target.value)}
                    placeholder={selectedProviderDef.nameAr}
                    dir="rtl"
                    required
                  />
                </Field>

                <Field label={t("bankNameEn")} htmlFor="acc-bank-name-en">
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

              <Field
                label={
                  isAr
                    ? selectedProviderDef.accountHolderLabelAr
                    : selectedProviderDef.accountHolderLabelEn
                }
                htmlFor="acc-holder"
              >
                <Input
                  id="acc-holder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder={
                    isAr
                      ? selectedProviderDef.accountHolderPlaceholderAr
                      : selectedProviderDef.accountHolderPlaceholderEn
                  }
                />
              </Field>

              <Field
                label={
                  isAr
                    ? selectedProviderDef.identifierLabelAr
                    : selectedProviderDef.identifierLabelEn
                }
                htmlFor="acc-iban"
                required
              >
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

              {isBankType ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t("swiftLabel")} htmlFor="acc-swift">
                    <Input
                      id="acc-swift"
                      value={swift}
                      onChange={(e) => setSwift(e.target.value.toUpperCase())}
                      placeholder={selectedProviderDef.swiftPlaceholder ?? "RJHISARI"}
                      dir="ltr"
                      className="font-mono text-xs uppercase text-start"
                    />
                  </Field>

                  <Field label={t("currencyLabel")} htmlFor="acc-currency" required>
                    <Select
                      id="acc-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.code} - {locale === "ar" ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                      {currency &&
                      !SUPPORTED_CURRENCIES.some((c) => c.code === currency) ? (
                        <option value={currency}>{currency}</option>
                      ) : null}
                    </Select>
                  </Field>
                </div>
              ) : (
                <Field label={t("currencyLabel")} htmlFor="acc-currency" required>
                  <Select
                    id="acc-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} - {locale === "ar" ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                    {currency &&
                    !SUPPORTED_CURRENCIES.some((c) => c.code === currency) ? (
                      <option value={currency}>{currency}</option>
                    ) : null}
                  </Select>
                </Field>
              )}
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex h-11 cursor-pointer items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-3.5 text-xs text-foreground transition-colors hover:bg-muted/30 select-none">
              <span className="font-medium">{t("activeCheckbox")}</span>
              <Checkbox
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                sx={{ p: 0.5 }}
              />
            </label>

            <label className="flex h-11 cursor-pointer items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-3.5 text-xs text-foreground transition-colors hover:bg-muted/30 select-none">
              <span className="font-medium">{t("primaryCheckbox")}</span>
              <Checkbox
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                sx={{ p: 0.5 }}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 mt-2 border-t border-border/60">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDialogOpen(false)}
              disabled={pending}
              className="gap-2"
            >
              <X size={15} aria-hidden="true" />
              <span>{t("cancel")}</span>
            </Button>
            <Button
              type="submit"
              loading={pending}
              className="gap-2"
            >
              <Check size={15} aria-hidden="true" />
              <span>{t("save")}</span>
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMsg")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={pending}
      />
    </Card>
  );
}
