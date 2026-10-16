// Dossier - Test Email Button Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { sendTestEmailAction } from "@/server/actions/settings";

export function TestEmailButton({ disabled }: { disabled?: boolean }) {
  const t = useTranslations();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const result = await sendTestEmailAction();
    setPending(false);
    if (result.ok) {
      toast({ title: t("settings.worker.testEmailQueued"), tone: "success" });
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      loading={pending}
      disabled={disabled}
      className="gap-2"
    >
      <Mail size={16} aria-hidden="true" />
      <span>{t("settings.worker.testEmail")}</span>
    </Button>
  );
}
