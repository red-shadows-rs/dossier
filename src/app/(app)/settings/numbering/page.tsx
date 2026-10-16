import { getTranslations } from "next-intl/server";
import { FileText, Receipt } from "lucide-react";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsSectionDef,
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
  const currentYear = new Date().getFullYear();

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

  const sections: SettingsSectionDef[] = [
    {
      title: t("numbering"),
      description: t("numberingDesc"),
      icon: "hash",
      fields,
    },
  ];

  const values: SettingsValues = { prefix: numbering.prefix };

  return (
    <div className="flex flex-col gap-6">
      <SettingsForm
        sections={sections}
        values={values}
        action={updateNumberingAction}
        disabled={!canWrite}
      />

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2.5 text-base">
            <FileText size={18} className="text-primary shrink-0" aria-hidden="true" />
            <span>{t("numberingPreview")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center gap-2.5">
                <Receipt size={17} className="text-primary" />
                <span className="text-sm font-medium">فواتير المبيعات</span>
              </div>
              <span className="font-mono text-xs font-bold text-foreground bg-card px-2.5 py-1 rounded border border-border/80">
                {numbering.prefix}-I-{currentYear}-0001
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center gap-2.5">
                <FileText size={17} className="text-primary" />
                <span className="text-sm font-medium">العقود والاتفاقيات</span>
              </div>
              <span className="font-mono text-xs font-bold text-foreground bg-card px-2.5 py-1 rounded border border-border/80">
                {numbering.prefix}-C-{currentYear}-0001
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
