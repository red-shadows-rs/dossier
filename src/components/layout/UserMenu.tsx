import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/server/auth/session";

export async function UserMenu({ user }: { user: SessionUser }) {
  const t = await getTranslations("nav");

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface">
        <span className="max-w-[10rem] truncate">{user.name}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="transition-transform group-open:rotate-180 rtl:rotate-180"
        />
      </summary>
      <div className="absolute end-0 z-40 mt-2 flex w-48 flex-col gap-1 rounded-md border border-border bg-surface p-1 shadow-lg">
        <Link
          href="/account"
          className="rounded px-3 py-2 text-sm text-foreground hover:bg-background"
        >
          {t("account")}
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded px-3 py-2 text-start text-sm text-destructive hover:bg-background"
          >
            {t("logout")}
          </button>
        </form>
      </div>
    </details>
  );
}
