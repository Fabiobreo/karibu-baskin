"use client";
import { useEffect } from "react";

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
    console.error("[global error boundary]", { name: error.name, message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="it">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
        color: "#fff",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        gap: "16px",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- global-error non può usare next/image: sostituisce il root layout */}
        <img src="/logo.png" alt="Karibu Baskin" style={{ width: 72, height: 72, objectFit: "contain", opacity: 0.85 }} />
        <div style={{ fontSize: "5rem", fontWeight: 900, color: "#E65100", lineHeight: 1 }}>500</div>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>Errore critico</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: 360, lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
          Si è verificato un errore grave nell&apos;applicazione. Riprova oppure torna alla home.
        </p>
        {error.digest && (
          <p style={{ color: "rgba(255,255,255,0.2)", margin: 0, fontSize: "0.7rem", fontFamily: "monospace" }}>
            ref: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#E65100", color: "#fff", border: "none",
              borderRadius: 12, padding: "12px 28px", fontSize: "0.95rem",
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Riprova
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error non può usare next/link: sostituisce il root layout */}
          <a
            href="/"
            style={{
              background: "transparent", color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12,
              padding: "12px 28px", fontSize: "0.95rem", fontWeight: 700,
              textDecoration: "none", display: "inline-block",
            }}
          >
            Torna alla home
          </a>
        </div>
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, transparent, #E65100, transparent)",
          opacity: 0.6,
        }} />
      </body>
    </html>
  );
}
