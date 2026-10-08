"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold text-foreground">{t("INTERNAL")}</h1>
      <Button type="button" onClick={reset}>
        {tc("retry")}
      </Button>
    </main>
  );
}
