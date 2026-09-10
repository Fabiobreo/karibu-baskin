import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Senza questo export gli errori server dell'App Router (render dei Server
// Component e route handler) non arrivano a Sentry: il SDK li riceve solo
// tramite l'hook onRequestError di Next. Era il motivo per cui i 500 in
// produzione non comparivano da nessuna parte.
export const onRequestError = Sentry.captureRequestError;
