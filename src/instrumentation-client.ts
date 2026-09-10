import * as Sentry from "@sentry/nextjs";

// Init del Sentry lato browser.
//
// Sta qui e non piu' in `sentry.client.config.ts` perche' quel file lo inietta
// solo il plugin webpack del SDK: dalla 16 Next builda con Turbopack, quindi in
// produzione non veniva mai caricato e `Sentry.init` non partiva affatto
// (`window.__SENTRY__` undefined, nessun evento inviato). `instrumentation-client`
// e' la convenzione Next equivalente, valida con entrambi i bundler.
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

// Aggancia le navigazioni dell'App Router agli eventi, come onRequestError fa
// lato server.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
