import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { Analytics } from "@vercel/analytics/react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { COLOR_MODE_COOKIE, COLOR_SCHEME_COOKIE, resolveScheme } from "@/lib/colorMode";
import { ToastProvider } from "@/context/ToastContext";
import Providers from "@/components/layout/Providers";
import ServiceWorkerRegistrar from "@/components/layout/ServiceWorkerRegistrar";
import OfflineBanner from "@/components/layout/OfflineBanner";
import SiteHeader from "@/components/layout/SiteHeader";
import SkipToContent from "@/components/layout/SkipToContent";
import Footer from "@/components/layout/Footer";
import SponsorBanner from "@/components/common/SponsorBanner";
import BottomNav from "@/components/layout/BottomNav";
import SwUpdateToast from "@/components/layout/SwUpdateToast";
import CookieBanner from "@/components/layout/CookieBanner";
import InstallPrompt from "@/components/layout/InstallPrompt";
import Box from "@mui/material/Box";
import { auth } from "@/lib/authjs";
import { SITE_URL } from "@/lib/siteUrl";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Karibu Baskin | Montecchio Maggiore",
  description:
    "Iscriviti agli allenamenti e scopri le squadre del Karibu Baskin di Montecchio Maggiore.",
  manifest: "/manifest.json",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "Karibu Baskin | Montecchio Maggiore",
    description: "Iscriviti agli allenamenti e scopri le squadre del Karibu Baskin.",
    // Nessun `url` qui: è ereditato da ogni pagina che non lo sovrascrive e
    // farebbe puntare alla home l'identità di tutti i link condivisi. Le pagine
    // lo impostano da `buildMetadata` in @/lib/seo.
    siteName: "Karibu Baskin",
    // Nessun `images` esplicito: così vale la convenzione file-based di Next
    // (`src/app/opengraph-image.tsx`, 1200x630) invece del logo 512x512.
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Karibu Baskin | Montecchio Maggiore",
    description: "Iscriviti agli allenamenti del Karibu Baskin.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Karibu Baskin",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

// Script bloccante: gira in <head> PRIMA di qualsiasi paint. In modalità
// "system" risolve la media query e la persiste nel cookie `karibu-scheme`,
// così dal caricamento successivo il Server Component rende già il tema giusto
// e non c'è nessun lampo chiaro. `data-scheme` su <html> serve subito, al primo
// caricamento, per lo sfondo pre-idratazione (vedi globals.css).
const COLOR_SCHEME_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )${COLOR_MODE_COOKIE}=([^;]+)/);
var mode=m&&m[1];
var explicit=mode==="light"||mode==="dark";
var scheme=explicit?mode:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
document.documentElement.dataset.scheme=scheme;
if(!explicit){document.cookie="${COLOR_SCHEME_COOKIE}="+scheme+"; path=/; max-age=31536000; samesite=lax";}
}catch(e){}})();`;

async function readColorPrefs() {
  const store = await cookies();
  const modeRaw = store.get(COLOR_MODE_COOKIE)?.value;
  const mode =
    modeRaw === "light" || modeRaw === "dark" || modeRaw === "system" ? modeRaw : "system";
  const hintRaw = store.get(COLOR_SCHEME_COOKIE)?.value;
  const hint = hintRaw === "dark" ? "dark" : "light";
  return { mode, scheme: resolveScheme(mode, hint) } as const;
}

export async function generateViewport(): Promise<Viewport> {
  const { scheme } = await readColorPrefs();
  return {
    // La barra di stato PWA segue il tema risolto: arancione in chiaro,
    // grigio scurissimo in scuro (prima era fissa su #E65100).
    themeColor: scheme === "dark" ? "#121212" : "#E65100",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const locale = await getLocale();
  const messages = await getMessages();

  const { mode: colorMode, scheme: colorScheme } = await readColorPrefs();

  return (
    // suppressHydrationWarning: allo sbarco senza cookie lo script in <head>
    // corregge `data-scheme` prima dell'idratazione.
    <html
      lang={locale}
      className={inter.variable}
      data-scheme={colorScheme}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_SCRIPT }} />
      </head>
      <body
        className={inter.className}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
        suppressHydrationWarning
      >
        {/* beforeinstallprompt puo scattare prima dell'idratazione: lo parcheggiamo
            su window, InstallPrompt lo recupera al mount. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__kbInstallPrompt=e;});",
          }}
        />
        <AppRouterCacheProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <ServiceWorkerRegistrar />
            <Providers session={session} colorMode={colorMode} colorScheme={colorScheme}>
              <ToastProvider>
                <SkipToContent />
                <SiteHeader />
                {/* tabIndex -1: senza, lo skip link sposta solo lo scroll e il
                    focus resta sul body. */}
                <Box
                  component="main"
                  id="contenuto"
                  tabIndex={-1}
                  sx={{ flex: 1, pb: { xs: "60px", md: 0 }, outline: "none" }}
                >
                  <OfflineBanner />
                  {children}
                </Box>
                <SponsorBanner />
                <Footer />
                <BottomNav />
                <SwUpdateToast />
                <CookieBanner />
                <InstallPrompt />
              </ToastProvider>
            </Providers>
          </NextIntlClientProvider>
        </AppRouterCacheProvider>
        <Analytics />
      </body>
    </html>
  );
}
