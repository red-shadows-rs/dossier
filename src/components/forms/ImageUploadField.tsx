"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/lib/result";

export function ImageUploadField({
  label,
  currentFileId,
  action,
  disabled,
}: {
  label: string;
  currentFileId: string | null;
  action: (formData: FormData) => Promise<ActionResult<{ fileId: string }>>;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast({ title: t("errors.FILE_REJECTED"), tone: "error" });
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    setPending(true);
    const result = await action(formData);
    setPending(false);
    if (result.ok) {
      if (inputRef.current) inputRef.current.value = "";
      toast({ title: t("settings.saved"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-background p-2">
        {currentFileId ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated API image; next/image needs a custom loader
          <img
            src={`/api/files/${currentFileId}?inline=1`}
            alt={label}
            className="max-h-16 w-auto object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("settings.noFile")}
          </span>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || pending}
          className="block w-full text-xs text-muted-foreground file:me-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-foreground"
        />
        <Button type="submit" size="sm" loading={pending} disabled={disabled}>
          {t("settings.upload")}
        </Button>
      </form>
    </div>
  );
}
