import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/forms/LoginForm";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { getCurrentUser } from "@/server/auth/require-user";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  const t = await getTranslations("auth");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 py-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <LocaleSwitch variant="toggle" />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold text-foreground">{t("loginTitle")}</h1>
        <LoginForm />
      </main>
      <footer className="text-center text-sm text-muted-foreground">
        {tc("tagline")}
      </footer>
    </div>
  );
}