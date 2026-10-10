// Dossier - Project Files Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { formatSize } from "@/lib/files";
import {
  deleteAttachmentAction,
  uploadAttachmentAction,
} from "@/server/actions/files";

export type AttachmentItem = {
  id: string;
  originalName: string | null;
  sizeBytes: number;
};

export function ProjectFiles({
  projectId,
  attachments,
  canWrite,
}: {
  projectId: string;
  attachments: AttachmentItem[];
  canWrite: boolean;
}) {
  const t = useTranslations("projects");
  const toast = useToast();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  async function onUpload() {
    if (!selectedFile) {
      toast({ title: t("files.noFile"), tone: "error" });
      return;
    }
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("file", selectedFile);
    setPending(true);
    const result = await uploadAttachmentAction(formData);
    setPending(false);
    if (result.ok) {
      setSelectedFile(null);
      toast({ title: t("files.uploaded"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  async function onDelete(id: string) {
    setPending(true);
    const result = await deleteAttachmentAction({ id, projectId });
    setPending(false);
    if (result.ok) {
      toast({ title: t("files.deleted"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <div className="flex flex-col gap-4">
      {canWrite ? (
        <div className="flex flex-col gap-2.5">
          <FileUpload
            accept="application/pdf,image/png,image/jpeg,image/webp"
            disabled={pending}
            pending={pending}
            onFileSelect={(file) => setSelectedFile(file)}
            onClear={() => setSelectedFile(null)}
          />
          {selectedFile ? (
            <div className="flex items-center justify-end">
              <Button
                type="button"
                size="sm"
                loading={pending}
                onClick={onUpload}
                className="gap-1.5"
              >
                <Upload size={15} aria-hidden="true" />
                <span>{t("files.upload")}</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("files.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3.5 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={16} className="text-primary shrink-0" aria-hidden="true" />
                <a
                  href={`/api/files/${attachment.id}`}
                  className="truncate text-foreground font-medium hover:text-primary transition-colors"
                >
                  {attachment.originalName ?? attachment.id}
                </a>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums font-mono" dir="ltr">
                  {formatSize(attachment.sizeBytes)}
                </span>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => onDelete(attachment.id)}
                    disabled={pending}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                    title={t("files.delete")}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
