"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { PROJECT_STATUSES } from "@/lib/constants";
import {
  archiveProjectAction,
  setProjectStatusAction,
  unarchiveProjectAction,
} from "@/server/actions/projects";

export function ProjectActions({
  projectId,
  status,
  archived,
}: {
  projectId: string;
  status: (typeof PROJECT_STATUSES)[number];
  archived: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onStatusChange(next: string) {
    setPending(true);
    const result = await setProjectStatusAction({
      id: projectId,
      status: next,
    });
    setPending(false);
    if (result.ok) {
      toast({ title: t("projects.statusChanged"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  async function onConfirm() {
    setPending(true);
    const result = archived
      ? await unarchiveProjectAction({ id: projectId })
      : await archiveProjectAction({ id: projectId });
    setPending(false);
    setOpen(false);
    if (result.ok) {
      toast({
        title: t(archived ? "projects.unarchived" : "projects.archivedToast"),
        tone: "success",
      });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label={t("projects.statusLabel")}
        value={status}
        disabled={pending}
        onChange={(event) => onStatusChange(event.currentTarget.value)}
        className="w-40"
      >
        {PROJECT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {t(`projects.status.${value}`)}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant={archived ? "secondary" : "danger"}
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        {archived ? (
          <ArchiveRestore size={15} aria-hidden="true" />
        ) : (
          <Archive size={15} aria-hidden="true" />
        )}
        <span>{t(archived ? "projects.unarchive" : "projects.archive")}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        title={t(archived ? "projects.unarchive" : "projects.archive")}
        message={t(
          archived ? "projects.unarchiveConfirm" : "projects.archiveConfirm",
        )}
        confirmLabel={t(archived ? "projects.unarchive" : "projects.archive")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone={archived ? "primary" : "danger"}
      />
    </div>
  );
}
