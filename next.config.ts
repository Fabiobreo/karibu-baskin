import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-* richiesti da MUI/Emotion; va.vercel-scripts.com e' lo script di
      // Vercel Analytics, che senza questa voce veniva bloccato in silenzio.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'", // Emotion CSS-in-JS
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.public.blob.vercel-storage.com",
      "font-src 'self'",
      // Gli endpoint *.ingest.sentry.io sono l'ingest del DSN: senza, il Sentry
      // del browser raccoglie gli errori e poi si vede bloccare ogni POST.
      // Le tre forme coprono progetti US/EU e DSN senza suffisso di regione.
      [
        "connect-src 'self'",
        "https://*.neon.tech",
        "https://*.blob.vercel-storage.com",
        "https://*.ingest.sentry.io",
        "https://*.ingest.us.sentry.io",
        "https://*.ingest.de.sentry.io",
        "wss:",
      ].join(" "),
      // Session Replay di Sentry gira in un worker creato da un blob.
      "worker-src 'self' blob:",
      "frame-src https://maps.google.com https://www.google.com https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.15.109", "localhost", "127.0.0.1"],
  // Le OG dinamiche leggono i font da public/fonts a runtime. Il file tracing di
  // Next non li rileva (il path è costruito con un template literal) e su Vercel
  // public/ non finisce nel bundle delle funzioni: senza questo, in produzione
  // i font non si caricherebbero e i titoli tornerebbero al peso di default.
  outputFileTracingIncludes: {
    "/giocatori/[slug]/opengraph-image": ["./public/fonts/*.ttf"],
    "/partite/[slug]/opengraph-image": ["./public/fonts/*.ttf"],
    "/squadre/[season]/[slug]/opengraph-image": ["./public/fonts/*.ttf"],
  },
  images: {
    remotePatterns: [
      {
        // Foto profilo Google OAuth
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Immagini Vercel Blob
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        // Copertine video YouTube (Gallery)
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Carica le source map solo in CI (quando SENTRY_AUTH_TOKEN è impostato)
  silent: !process.env.CI,
  // Opzioni del bundler webpack (build di produzione; ignorate con Turbopack in dev)
  webpack: {
    // Rimuove i log di debug del client SDK in produzione (ex disableLogger)
    treeshake: { removeDebugLogging: true },
    // Non fare auto-instrumentazione Prisma/HTTP — la gestiamo noi (ex top-level)
    autoInstrumentServerFunctions: false,
  },
});
