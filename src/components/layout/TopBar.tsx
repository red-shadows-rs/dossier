import { cookies } from "next/headers";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { UserMenu } from "@/components/layout/UserMenu";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import type { SessionUser } from "@/server/auth/session";

export async function TopBar({ user }: { user: SessionUser }) {
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4">
      <div className="md:hidden">
        <span className="text-lg font-bold text-primary">Dossier</span>
      </div>
      <div className="ms-auto flex items-center gap-3">
        <LocaleSwitch />
        <ThemeSwitch current={theme} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
