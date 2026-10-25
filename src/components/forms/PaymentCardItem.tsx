// Dossier - Payment Card Item Component
// https://github.com/red-shadows-rs/dossier

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Building2, Check, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { PaymentCardData } from "@/lib/payment-methods";

export function PaymentCardItem({ card }: { card: PaymentCardData }) {
  const t = useTranslations("invoices");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(val: string, key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  const isBinance = card.provider === "binance";
  const isPaypal = card.provider === "paypal";

  const walletLabel = card.network
    ? `${t("wallet")} (${card.network})`
    : card.identifierLabel || t("walletAddress");

  return (
    <div className="flex flex-col rounded-lg border border-border/70 bg-surface/50 p-3.5 gap-2.5 shadow-2xs transition-all hover:border-border">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-card p-1 shadow-2xs">
            {card.icon ? (
              <Image
                src={card.icon}
                alt={card.bankName}
                width={26}
                height={26}
                unoptimized
                className="max-h-6 max-w-6 object-contain"
              />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-foreground truncate">
              {card.bankName}
            </span>
            {card.accountHolder ? (
              <span className="text-[11px] text-muted-foreground truncate">
                <span className="text-muted-foreground/70">{t("beneficiary")}:</span> {card.accountHolder}
              </span>
            ) : null}
          </div>
        </div>

        {card.currency ? (
          <Badge tone="gray" dot={false} className="text-[10px] px-2 py-0.5 font-mono shrink-0">
            {card.currency}
          </Badge>
        ) : null}
      </div>

      {isBinance ? (
        <div className="flex flex-col gap-1.5">
          {card.binanceUid ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {t("binanceUid")}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.binanceUid}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.binanceUid ?? "", "uid")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "uid" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "uid" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.binancePayId ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {t("binancePayId")}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.binancePayId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.binancePayId ?? "", "payid")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "payid" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "payid" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.username ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {t("username")}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.username.startsWith("@") ? card.username : `@${card.username}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.username ?? "", "username")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "username" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "username" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.identifierValue && card.identifierValue !== card.binanceUid && card.identifierValue !== card.binancePayId ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {walletLabel}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.identifierValue}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.identifierValue, "wallet")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "wallet" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "wallet" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : isPaypal ? (
        <div className="flex flex-col gap-1.5">
          {card.identifierValue ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {t("paypalEmail")}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.identifierValue}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.identifierValue, "email")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "email" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "email" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.username ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {t("username")}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.username.startsWith("@") ? card.username : `@${card.username}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.username ?? "", "username")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "username" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "username" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.paymentUrl ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-primary/5 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-primary font-medium">
                  {t("paymentLink")}
                </span>
                <a
                  href={
                    card.paymentUrl.startsWith("http://") || card.paymentUrl.startsWith("https://")
                      ? card.paymentUrl
                      : `https://${card.paymentUrl}`
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-mono text-xs text-primary font-semibold hover:underline max-w-full truncate"
                  dir="ltr"
                >
                  <span className="truncate">{card.paymentUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => copy(card.paymentUrl ?? "", "payurl")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "payurl" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "payurl" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {card.identifierValue ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {card.identifierLabel}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.identifierValue}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.identifierValue, "id")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "id" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "id" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.swift ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {t("swiftLabel")}
                </span>
                <span className="font-mono font-semibold text-foreground truncate max-w-full" dir="ltr">
                  {card.swift}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (card.swift) copy(card.swift, "swift");
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "swift" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "swift" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
