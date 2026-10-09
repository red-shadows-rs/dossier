"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  deleteAttachmentAction,
  uploadAttachmentAction,
} from "@/server/actions/files";

export type AttachmentItem = {
  id: string;
  originalName: string | null;
  sizeBytes: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast({ title: t("files.noFile"), tone: "error" });
      return;
    }
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("file", file);
    setPending(true);
    const result = await uploadAttachmentAction(formData);
    setPending(false);
    if (result.ok) {
      if (inputRef.current) inputRef.current.value = "";
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
        <form onSubmit={onUpload} className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            disabled={pending}
            className="block text-xs text-muted-foreground file:me-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-foreground"
          />
          <Button type="submit" size="sm" loading={pending}>
            {t("files.upload")}
          </Button>
        </form>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("files.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <a
                href={`/api/files/${attachment.id}`}
                className="truncate text-foreground hover:text-primary"
              >
                {attachment.originalName ?? attachment.id}
              </a>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {formatSize(attachment.sizeBytes)}
                </span>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => onDelete(attachment.id)}
                    disabled={pending}
                    className="text-xs text-destructive hover:underline"
                  >
                    {t("files.delete")}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
