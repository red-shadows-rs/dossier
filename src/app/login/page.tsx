import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/forms/LoginForm";
import { getCurrentUser } from "@/server/auth/require-user";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-primary">{t("loginTitle")}</h1>
      <LoginForm />
    </main>
  );
}
