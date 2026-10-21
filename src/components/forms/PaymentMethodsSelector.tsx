// Dossier - Payment Methods Selector Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { BANK_PROVIDERS } from "@/lib/constants";
import type { BankAccount } from "@/lib/validation/settings";
import { cn } from "@/components/ui/cn";

export function PaymentMethodsSelector({
  accounts,
  selectedIds,
  onChange,
  disabled,
}: {
  accounts: BankAccount[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("invoices");
  const locale = useLocale();

  useEffect(() => {
    if (accounts.length > 0 && selectedIds.length === 0) {
      const primary =
        accounts.find((a) => a.isActive && a.isPrimary) ??
        accounts.find((a) => a.isActive) ??
        accounts[0];
      if (primary) {
        onChange([primary.id]);
      }
    }
  }, [accounts, selectedIds, onChange]);

  if (accounts.length === 0) {
    return (
      <div className="rounded border border-dashed border-border/80 p-3 text-center text-xs text-muted-foreground bg-muted/10">
        {t("noBankAccountsConfigured")}
      </div>
    );
  }

  function toggle(id: string) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) {
        return;
      }
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="flex items-center text-xs font-semibold tracking-tight text-foreground/90 select-none">
        <span>{t("paymentAccounts")}</span>
        <span
          aria-hidden="true"
          className="ms-1 align-super text-xs text-primary font-bold"
        >
          *
        </span>
      </label>

      <div
        className={cn(
          "grid gap-2.5",
          accounts.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {accounts.map((acc) => {
          const isSelected = selectedIds.includes(acc.id);
          const prov = BANK_PROVIDERS.find((p) => p.id === acc.provider);
          const bankName =
            locale === "ar"
              ? acc.bankNameAr || acc.bankNameEn || prov?.nameAr || acc.provider
              : acc.bankNameEn || acc.bankNameAr || prov?.nameEn || acc.provider;

          let idLabel = locale === "ar" ? "الآيبان" : "IBAN";
          let displayValue = acc.iban;

          if (acc.provider === "binance") {
            if (acc.binanceUid) {
              idLabel = "UID";
              displayValue = acc.binanceUid;
            } else if (acc.binancePayId) {
              idLabel = "Pay ID";
              displayValue = acc.binancePayId;
            } else if (acc.network && acc.iban) {
              idLabel = acc.network;
              displayValue = acc.iban;
            } else {
              idLabel = "Binance";
            }
          } else if (acc.provider === "paypal") {
            if (acc.iban) {
              idLabel = locale === "ar" ? "البريد" : "Email";
              displayValue = acc.iban;
            } else if (acc.paymentUrl) {
              idLabel = "PayPal.Me";
              displayValue = acc.paymentUrl;
            } else if (acc.username) {
              idLabel = locale === "ar" ? "المعرف" : "Handle";
              displayValue = `@${acc.username}`;
            }
          } else if (acc.provider === "barq" || acc.provider === "stcpay") {
            idLabel = locale === "ar" ? "المحفظة" : "Wallet";
          }

          return (
            <div
              key={acc.id}
              onClick={() => toggle(acc.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded border px-3 py-2 min-h-[44px] transition-colors cursor-pointer select-none",
                isSelected
                  ? "border-primary/50 bg-primary/5 text-foreground"
                  : "border-border/80 bg-background/50 hover:border-border hover:bg-muted/20 text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggle(acc.id)}
                    disabled={disabled}
                  />
                </div>

                {prov?.icon ? (
                  <div
                    className="flex h-7 w-8 shrink-0 items-center justify-center rounded border border-border/40 p-0.5 overflow-hidden"
                    style={{
                      background: prov.id === "barq" ? "#000000" : "#ffffff",
                    }}
                  >
                    <Image
                      src={prov.icon}
                      alt={bankName}
                      width={24}
                      height={24}
                      unoptimized
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                )}

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {bankName}
                    </span>
                    {acc.accountHolder ? (
                      <span className="text-[11px] text-muted-foreground truncate hidden md:inline">
                        ({acc.accountHolder})
                      </span>
                    ) : null}
                  </div>
                  {displayValue ? (
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {idLabel}:
                      </span>
                      <span className="font-mono text-[11px] text-foreground/80 truncate select-all" dir="ltr">
                        {displayValue}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {acc.isPrimary ? (
                <Badge tone="red" dot={false} className="gap-1 px-2 py-0.5 text-[10px] shrink-0 font-medium">
                  {t("primaryAccount")}
                </Badge>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
