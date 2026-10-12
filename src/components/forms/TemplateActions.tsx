// Dossier - Template Actions Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  archiveTemplateAction,
  duplicateTemplateAction,
} from "@/server/actions/templates";

export function TemplateActions({
  templateId,
  isSystem,
}: {
  templateId: string;
  isSystem: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [dialog, setDialog] = useState<"duplicate" | "archive" | null>(null);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    if (!dialog) return;
    const action = dialog;
    setPending(true);
    const result =
      action === "duplicate"
        ? await duplicateTemplateAction({ id: templateId })
        : await archiveTemplateAction({ id: templateId });
    setPending(false);
    setDialog(null);
    if (result.ok) {
      toast({
        title: t(
          action === "duplicate"
            ? "templates.duplicatedToast"
            : "templates.archivedToast",
        ),
        tone: "success",
      });
      if (action === "duplicate" && result.data) {
        router.push(`/templates/${result.data.id}/edit`);
      } else {
        router.push("/templates");
      }
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDialog("duplicate")}
          className="gap-2"
        >
          <Copy size={16} aria-hidden="true" />
          <span>{t("templates.duplicate")}</span>
        </Button>
        {isSystem ? null : (
          <Button
            type="button"
            variant="danger"
            onClick={() => setDialog("archive")}
            className="gap-2"
          >
            <Archive size={16} aria-hidden="true" />
            <span>{t("templates.archive")}</span>
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={dialog === "duplicate"}
        onClose={() => setDialog(null)}
        onConfirm={onConfirm}
        title={t("templates.duplicate")}
        message={t("templates.duplicateConfirm")}
        confirmLabel={t("templates.duplicate")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone="primary"
      />
      <ConfirmDialog
        open={dialog === "archive"}
        onClose={() => setDialog(null)}
        onConfirm={onConfirm}
        title={t("templates.archive")}
        message={t("templates.archiveConfirm")}
        confirmLabel={t("templates.archive")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone="danger"
      />
    </>
  );
}
