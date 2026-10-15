"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/lib/result";

export function ImageUploadField({
  label,
  currentFileId,
  action,
  deleteAction,
  disabled,
}: {
  label: string;
  currentFileId: string | null;
  action: (formData: FormData) => Promise<ActionResult<{ fileId: string }>>;
  deleteAction?: () => Promise<ActionResult<null>>;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  async function uploadFile(targetFile: File) {
    const formData = new FormData();
    formData.set("file", targetFile);
    setPending(true);
    const result = await action(formData);
    setPending(false);
    if (result.ok) {
      setFile(null);
      toast({ title: t("settings.saved"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  async function handleFileSelect(selected: File) {
    setFile(selected);
    await uploadFile(selected);
  }

  async function handleDelete() {
    if (file) {
      setFile(null);
      return;
    }
    if (currentFileId && deleteAction) {
      setPending(true);
      const result = await deleteAction();
      setPending(false);
      if (result.ok) {
        toast({ title: t("settings.saved"), tone: "success" });
        router.refresh();
        return;
      }
      toast({ title: t(`errors.${result.error.code}`), tone: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FileUpload
        label={label}
        accept="image/png,image/jpeg,image/webp"
        currentFileId={currentFileId}
        isImage
        disabled={disabled || pending}
        pending={pending}
        onFileSelect={handleFileSelect}
        onClear={handleDelete}
      />

      {file && !pending ? (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            loading={pending}
            disabled={disabled}
            onClick={() => uploadFile(file)}
            className="gap-1.5"
          >
            <Upload size={15} aria-hidden="true" />
            <span>{t("settings.upload")}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
