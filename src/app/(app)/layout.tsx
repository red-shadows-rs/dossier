// Dossier - Root Layout
// https://github.com/red-shadows-rs/dossier

import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";

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
          {isDemoUser(user.email) && <DemoBanner />}
          <TopBar user={user} />
          <main
            id="main"
            className="w-full flex-1 p-3 pt-3 md:p-4 lg:p-6 lg:pt-4"
          >
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </ToastProvider>
  );
}