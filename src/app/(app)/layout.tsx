import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { requireUserPage } from "@/server/auth/require-user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUserPage();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-background">
        <Sidebar role={user.role} canSignForCompany={user.canSignForCompany} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={user} />
          <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
