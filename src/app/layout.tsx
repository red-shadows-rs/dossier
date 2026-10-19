// Dossier - Root Layout
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/Providers";
import { NavigationProgressBar } from "@/components/ui/NavigationProgressBar";
import { resolveTheme, THEME_COOKIE, themeClass } from "@/lib/i18n";
import "./globals.css";

const cairo = localFont({
  src: "../../assets/fonts/Cairo.ttf",
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Dossier",
    default: "Dossier",
  },
  description: "Contracts & invoices platform",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
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
      suppressHydrationWarning
    >
      <head>
        <InitColorSchemeScript
          attribute="class"
          defaultMode={theme === "light" ? "light" : "dark"}
        />
      </head>
      <body>
        <Providers dir={dir} colorTheme={theme}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Suspense fallback={null}>
              <NavigationProgressBar />
            </Suspense>
            {children}
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}