import { signOut } from "next-auth/react";
import { purgeServiceWorkerCaches } from "@/lib/swCachePurge";
import { releasePushSubscription } from "@/lib/pushSubscription";

/**
 * Uscita dall'account: prima si stacca dall'utente l'iscrizione push del
 * dispositivo (se non riesce si esce lo stesso), poi si svuotano le cache del
 * service worker (pagine e API personalizzate), poi Auth.js.
 *
 * `signOut` chiede al server il token CSRF e poi chiude la sessione: senza
 * rete rifiuta, e da un bottone del menu era un errore non gestito (Sentry,
 * "Failed to fetch" su / e /profilo). Restituisce `false` se non è riuscita,
 * così chi la chiama può dirlo.
 */
export async function safeSignOut(): Promise<boolean> {
  try {
    await releasePushSubscription().catch(() => {});
    await purgeServiceWorkerCaches();
    await signOut({ callbackUrl: "/" });
    return true;
  } catch {
    return false;
  }
}
