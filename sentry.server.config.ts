import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

// Pagine che montano una Server Action (oggi solo il form contatti). Altrove un
// POST con header `Next-Action` non arriva mai dall'app: sono scanner che
// cercano versioni vulnerabili di Next/React, e l'errore è solo rumore.
const SERVER_ACTION_PATHS = ["/contatti"];

function isServerActionProbe(event: Sentry.ErrorEvent): boolean {
  const message = event.exception?.values?.[0]?.value ?? "";
  if (!message.startsWith("Failed to find Server Action")) return false;
  const url = event.request?.url;
  if (!url) return false;
  try {
    const path = new URL(url).pathname.replace(/\/$/, "") || "/";
    return !SERVER_ACTION_PATHS.includes(path);
  } catch {
    return false;
  }
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      return isServerActionProbe(event) ? null : event;
    },
  });
}
