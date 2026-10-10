import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/server/auth/session";

export async function UserMenu({ user }: { user: SessionUser }) {
  const t = await getTranslations("nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="max-w-[10rem] truncate">{user.name}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/account">{t("account")}</Link>
        </DropdownMenuItem>
        <form action={logoutAction} className="w-full">
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="w-full cursor-pointer text-start text-destructive focus:text-destructive"
            >
              {t("logout")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}