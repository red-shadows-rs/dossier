import { getTranslations } from "next-intl/server";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { can } from "@/lib/permissions";
import { updateEmailAction } from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";

export default async function EmailSettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const email = getSettings("email");

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

  const values: SettingsValues = {
    fromName: email.fromName,
    overdueRemindersEnabled: email.overdueRemindersEnabled,
    overdueReminderDays: email.overdueReminderDays,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("email")}</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsForm
          fields={fields}
          values={values}
          action={updateEmailAction}
          disabled={!canWrite}
        />
      </CardContent>
    </Card>
  );
}
