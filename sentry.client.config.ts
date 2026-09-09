import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Nessuna registrazione della navigazione ordinaria: fra gli utenti ci sono
    // minori e una sessione in cui non succede nulla non ha valore diagnostico.
    // Si registra solo quando un errore si verifica davvero (riga sotto), che è
    // l'unico caso in cui il replay serve.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
}
