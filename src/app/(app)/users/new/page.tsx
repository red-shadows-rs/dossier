// Dossier - Users New Page
// https://github.com/red-shadows-rs/dossier

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  UserForm,
  type UserFormValues,
} from "@/components/forms/UserForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { smoothLoading } from "@/lib/smooth-loader";

const EMPTY: UserFormValues = {
  email: "",
  name: "",
  role: "member",
  canSignForCompany: false,
};

export default async function NewUserPage() {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "users.manage");
  const t = await getTranslations("users");
  const tc = await getTranslations("common");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/users"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{t("new")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs">
              <UserPlus size={22} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("new")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <Link href="/users">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5 font-medium shadow-xs"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
              <span>{tc("back")}</span>
            </Button>
          </Link>
        </div>
      </div>

      <UserForm mode="create" initial={EMPTY} />
    </div>
  );
}
