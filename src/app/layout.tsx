import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import Script from "next/script";
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

const themeScript =
  '(function(){try{var e=document.documentElement;if(!e.classList.contains("dark")&&!e.classList.contains("light")){e.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");}}catch(_){}})();';

export const metadata: Metadata = {
  title: "Dossier",
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
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Providers dir={dir} colorTheme={theme}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}