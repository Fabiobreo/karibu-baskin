import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { Analytics } from "@vercel/analytics/react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { COLOR_MODE_COOKIE } from "@/lib/colorMode";
import { ToastProvider } from "@/context/ToastContext";
import Providers from "@/components/layout/Providers";
import ServiceWorkerRegistrar from "@/components/layout/ServiceWorkerRegistrar";
import OfflineBanner from "@/components/layout/OfflineBanner";
import Footer from "@/components/layout/Footer";
import SponsorBanner from "@/components/common/SponsorBanner";
import BottomNav from "@/components/layout/BottomNav";
import SwUpdateToast from "@/components/layout/SwUpdateToast";
import CookieBanner from "@/components/layout/CookieBanner";
import Box from "@mui/material/Box";
import { auth } from "@/lib/authjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const BASE_URL = "https://karibu-baskin.vercel.app";

export const metadata: Metadata = {
  title: "Karibu Baskin | Montecchio Maggiore",
  description:
    "Iscriviti agli allenamenti e scopri le squadre — Karibu Baskin di Montecchio Maggiore.",
  manifest: "/manifest.json",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "Karibu Baskin — Montecchio Maggiore",
    description: "Iscriviti agli allenamenti e scopri le squadre del Karibu Baskin.",
    url: BASE_URL,
    siteName: "Karibu Baskin",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Karibu Baskin logo" }],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Karibu Baskin — Montecchio Maggiore",
    description: "Iscriviti agli allenamenti del Karibu Baskin.",
    images: ["/logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Karibu Baskin",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E65100",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const locale = await getLocale();
  const messages = await getMessages();

  const colorModeRaw = (await cookies()).get(COLOR_MODE_COOKIE)?.value;
  const colorMode =
    colorModeRaw === "light" || colorModeRaw === "dark" || colorModeRaw === "system"
      ? colorModeRaw
      : "system";

  return (
    <html lang={locale} className={inter.variable}>
      <body
        className={inter.className}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
        suppressHydrationWarning
      >
        <AppRouterCacheProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <ServiceWorkerRegistrar />
            <Providers session={session} colorMode={colorMode}>
              <ToastProvider>
                <Box component="main" sx={{ flex: 1, pb: { xs: "60px", md: 0 } }}>
                  <OfflineBanner />
                  {children}
                </Box>
                <SponsorBanner />
                <Footer />
                <BottomNav />
                <SwUpdateToast />
                <CookieBanner />
              </ToastProvider>
            </Providers>
          </NextIntlClientProvider>
        </AppRouterCacheProvider>
        <Analytics />
      </body>
    </html>
  );
}
