import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/Providers";
import { resolveTheme, THEME_COOKIE, themeClass } from "@/lib/i18n";
import "./globals.css";

const cairo = localFont({
  src: "../../assets/fonts/Cairo.ttf",
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dossier",
  description: "Contracts & invoices platform",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${cairo.variable} ${themeClass(theme)}`}
    >
      <body>
        <Providers dir={dir}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
