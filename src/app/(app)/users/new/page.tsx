import { getTranslations } from "next-intl/server";
import {
  UserForm,
  type UserFormValues,
} from "@/components/forms/UserForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";

const EMPTY: UserFormValues = {
  email: "",
  name: "",
  role: "member",
  canSignForCompany: false,
};

export default async function NewUserPage() {
  const user = await requireUserPage();
  assertCan(user, "users.manage");
  const t = await getTranslations("users");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("new")}</h1>
      <UserForm mode="create" initial={EMPTY} />
    </div>
  );
}
