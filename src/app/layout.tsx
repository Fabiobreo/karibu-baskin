import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Analytics } from "@vercel/analytics/react";
import theme from "@/theme";
import { ToastProvider } from "@/context/ToastContext";
import { PreviewRoleProvider } from "@/context/PreviewRoleContext";
import Providers from "@/components/Providers";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import PreviewBanner from "@/components/PreviewBanner";
import Footer from "@/components/Footer";
import { auth } from "@/lib/authjs";
import { cookies } from "next/headers";
import type { AppRole } from "@prisma/client";
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
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isAdmin = session?.user?.appRole === "ADMIN";
  const previewRole = isAdmin
    ? (cookieStore.get("preview_role")?.value as AppRole | null) ?? null
    : null;

  return (
    <html lang="it" className={inter.variable}>
      <body className={inter.className} style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ServiceWorkerRegistrar />
            <Providers>
              <PreviewRoleProvider previewRole={previewRole}>
                <ToastProvider>
                  <main style={{ flex: 1, paddingBottom: isAdmin ? "52px" : 0 }}>
                    {children}
                  </main>
                  <Footer />
                  {isAdmin && <PreviewBanner initialRole={previewRole} />}
                </ToastProvider>
              </PreviewRoleProvider>
            </Providers>
          </ThemeProvider>
        </AppRouterCacheProvider>
        <Analytics />
      </body>
    </html>
  );
}
