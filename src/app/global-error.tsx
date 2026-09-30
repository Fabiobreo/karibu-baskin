"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { heroGradient } from "@/lib/heroStyles";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TYPE_SCALE } from "@/lib/typeScale";
import { BRAND, HERO_TEXT } from "@/lib/palette";

// global-error sostituisce interamente il layout root, quindi
// non ha accesso a MUI ThemeProvider — usiamo CSS inline puro.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[global error boundary]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          background: heroGradient.dark,
          color: HERO_TEXT.primary,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          gap: "16px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- global-error non può usare next/image: sostituisce il root layout */}
        <img
          src="/logo.png"
          alt="Karibu Baskin"
          style={{ width: 72, height: 72, objectFit: "contain", opacity: 0.85 }}
        />
        <div
          style={{
            fontSize: TYPE_SCALE.xl8,
            fontWeight: FONT_WEIGHT.bold,
            // Come il codice di ErrorPage (primary.main).
            color: BRAND.orange,
            lineHeight: 1,
          }}
        >
          500
        </div>
        <h1 style={{ fontSize: TYPE_SCALE.xl, fontWeight: FONT_WEIGHT.bold, margin: 0 }}>
          Errore critico
        </h1>
        <p
          style={{
            color: HERO_TEXT.muted,
            maxWidth: 360,
            lineHeight: 1.7,
            margin: 0,
            fontSize: TYPE_SCALE.md,
          }}
        >
          Si è verificato un errore grave nell&apos;applicazione. Riprova oppure torna alla home.
        </p>
        {error.digest && (
          <p
            style={{
              color: HERO_TEXT.muted,
              margin: 0,
              fontSize: TYPE_SCALE.xs,
              fontFamily: "monospace",
            }}
          >
            ref: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              // Niente tema qui (errore del layout radice): stesso riempimento
              // del bottone primario, `primary.fill` del tema (UX-07).
              background: BRAND.orangeFill,
              color: BRAND.white,
              border: "none",
              borderRadius: 8, // RADIUS.md: qui niente tema
              padding: "12px 28px",
              fontSize: TYPE_SCALE.md,
              fontWeight: FONT_WEIGHT.semibold,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Riprova
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error non può usare next/link: sostituisce il root layout */}
          <a
            href="/"
            style={{
              background: "transparent",
              // Bottone "fantasma" sugli hero scuri.
              color: HERO_TEXT.secondary,
              border: `1px solid ${HERO_TEXT.lineStrong}`,
              borderRadius: 8, // RADIUS.md: qui niente tema
              padding: "12px 28px",
              fontSize: TYPE_SCALE.md,
              fontWeight: FONT_WEIGHT.semibold,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Torna alla home
          </a>
        </div>
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            // Filetto neutro: l'arancio resta a ciò che si tocca (UX-29).
            background: `linear-gradient(90deg, transparent, ${HERO_TEXT.lineStrong}, transparent)`,
          }}
        />
      </body>
    </html>
  );
}
