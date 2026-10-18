// Dossier - Demo Banner Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { exitDemoAction, resetDemoAction } from "@/server/actions/demo";

export function DemoBanner() {
  const t = useTranslations("demo");
  const toast = useToast();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    const result = await resetDemoAction();
    setResetting(false);
    if (result.ok) {
      toast({
        title: t("resetSuccess"),
        tone: "success",
      });
      window.location.reload();
    }
  }

  async function handleExit() {
    await exitDemoAction();
    window.location.href = "/login";
  }

  return (
    <div className="relative z-40 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-2 text-xs text-foreground sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="inline-flex h-5 items-center rounded border border-border/80 bg-muted/60 px-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("badge")}
        </span>
        <span className="truncate text-muted-foreground sm:inline">
          {t("bannerDesc")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={resetting}
          onClick={handleReset}
          className="h-7 gap-1.5 border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <RotateCcw size={12} className={resetting ? "animate-spin" : ""} />
          <span>{resetting ? t("resetting") : t("resetButton")}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExit}
          className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut size={12} />
          <span>{t("exitButton")}</span>
        </Button>
      </div>
    </div>
  );
}
