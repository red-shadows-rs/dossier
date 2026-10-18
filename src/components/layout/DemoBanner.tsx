// Dossier - Demo Banner Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { logoutAction } from "@/server/actions/auth";
import { resetDemoAction } from "@/server/actions/demo";

export function DemoBanner() {
  const t = useTranslations("demo");
  const router = useRouter();
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
      router.refresh();
    }
  }

  async function handleExit() {
    await logoutAction();
  }

  return (
    <div className="relative z-40 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 px-4 py-2.5 text-xs text-foreground backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-6 items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
          <Sparkles size={13} className="shrink-0" />
          <span>{t("badge")}</span>
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
          className="h-7 gap-1.5 border-amber-500/40 bg-background/80 px-2.5 text-xs font-medium hover:bg-amber-500/10"
        >
          <RotateCcw size={12} className={resetting ? "animate-spin" : ""} />
          <span>{resetting ? t("resetting") : t("resetButton")}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExit}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut size={12} />
          <span>{t("exitButton")}</span>
        </Button>
      </div>
    </div>
  );
}

