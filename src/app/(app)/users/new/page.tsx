import { getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <UserPlus size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("new")}</h1>
          </div>
        </div>
      </div>
      <UserForm mode="create" initial={EMPTY} />
    </div>
  );
}
