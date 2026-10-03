"use client";
import { useEffect } from "react";
import { syncPushSubscription } from "@/lib/pushSubscription";

/**
 * Registrazione del service worker.
 *
 * Solo in produzione: in sviluppo il worker intercetta i chunk di Turbopack e
 * l'hot reload, e un errore nella sua logica di cache si manifesta come un bug
 * dell'applicazione che non esiste. Per provare il worker in locale impostare
 * `NEXT_PUBLIC_ENABLE_SW_IN_DEV=true`.
 */
const ENABLED =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV === "true";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!ENABLED) {
      // Un worker installato da una sessione precedente sopravvive al cambio di
      // configurazione: va disinstallato esplicitamente, altrimenti continua a
      // servire dalla cache anche dopo che abbiamo smesso di registrarlo.
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      // L'iscrizione push si ripresenta al server a ogni apertura: se il
      // browser l'ha rinnovata, il server non resta con un indirizzo morto.
      .then(() => syncPushSubscription())
      .catch(() => {
        // registrazione o sincronizzazione fallita silenziosamente (es. in dev su HTTP)
      });
  }, []);

  return null;
}
