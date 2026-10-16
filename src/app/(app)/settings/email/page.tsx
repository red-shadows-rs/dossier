import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsSectionDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { TestEmailButton } from "@/components/forms/TestEmailButton";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { nowMs } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { workerHeartbeatSchema } from "@/lib/validation/settings";
import { updateEmailAction } from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getInternalSetting, getSettings } from "@/server/services/settings";

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

export default async function EmailSettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const email = getSettings("email");

  const heartbeat = getInternalSetting(
    "worker_heartbeat",
    workerHeartbeatSchema,
  );
  const workerStatus =
    heartbeat === null
      ? "never"
      : nowMs() - heartbeat.ts > HEARTBEAT_STALE_MS
        ? "stale"
        : "running";
  const workerLabel =
    workerStatus === "running"
      ? t("worker.running")
      : workerStatus === "stale"
        ? t("worker.stale")
        : t("worker.never");

  const fields: SettingsFieldDef[] = [
    { kind: "text", name: "fromName", label: t("fields.fromName") },
    {
      kind: "checkbox",
      name: "overdueRemindersEnabled",
      label: t("fields.overdueRemindersEnabled"),
    },
    {
      kind: "numberList",
      name: "overdueReminderDays",
      label: t("fields.overdueReminderDays"),
      placeholder: "1, 7, 14",
    },
  ];

  const sections: SettingsSectionDef[] = [
    {
      title: t("email"),
      description: t("emailDesc"),
      icon: "mail",
      fields,
    },
  ];

  const values: SettingsValues = {
    fromName: email.fromName,
    overdueRemindersEnabled: email.overdueRemindersEnabled,
    overdueReminderDays: email.overdueReminderDays,
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsForm
        sections={sections}
        values={values}
        action={updateEmailAction}
        disabled={!canWrite}
      />

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2.5">
            <Activity size={18} className="text-primary shrink-0" aria-hidden="true" />
            <span>{t("worker.title")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4">
            <Badge tone={workerStatus === "running" ? "green" : "red"}>
              {workerLabel}
            </Badge>
            <TestEmailButton disabled={!canWrite} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
