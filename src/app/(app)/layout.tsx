import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { requireUserPage } from "@/server/auth/require-user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUserPage();
  const tc = await getTranslations("common");

  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-foreground"
      >
        {tc("skipToContent")}
      </a>
      <div className="flex min-h-dvh bg-background">
        <Sidebar role={user.role} canSignForCompany={user.canSignForCompany} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={user} />
          <main
            id="main"
            className="w-full flex-1 p-4 md:p-6 lg:p-8"
          >
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </ToastProvider>
  );
}