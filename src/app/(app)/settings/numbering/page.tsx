import { getTranslations } from "next-intl/server";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { can } from "@/lib/permissions";
import { updateNumberingAction } from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";

export default async function NumberingSettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const numbering = getSettings("numbering");

  const fields: SettingsFieldDef[] = [
    {
      kind: "text",
      name: "prefix",
      label: t("fields.prefix"),
      dir: "ltr",
      maxLength: 6,
      placeholder: "DOS",
    },
  ];

  const values: SettingsValues = { prefix: numbering.prefix };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("numbering")}</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsForm
          fields={fields}
          values={values}
          action={updateNumberingAction}
          disabled={!canWrite}
        />
      </CardContent>
    </Card>
  );
}
