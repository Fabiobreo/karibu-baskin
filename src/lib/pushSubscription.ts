/**
 * Iscrizione push del dispositivo (solo browser).
 *
 * Il browser può rinnovare l'iscrizione (nuovo endpoint) o perderla, e Chrome
 * quasi mai avvisa il service worker (`pushsubscriptionchange`): il server
 * restava con un endpoint morto e quel telefono non riceveva più nulla, senza
 * che nessuno se ne accorgesse. `syncPushSubscription` a ogni apertura
 * dell'app ripresenta al server l'iscrizione attuale e, se è sparita ma
 * l'utente le aveva attivate, la ricrea senza chiedere nulla (il permesso c'è
 * già).
 */

/** Scelta dell'utente su questo dispositivo: "on" le ha attivate, "off" spente. */
const PUSH_CHOICE_KEY = "karibu-push";

export function rememberPushChoice(on: boolean): void {
  try {
    localStorage.setItem(PUSH_CHOICE_KEY, on ? "on" : "off");
  } catch {
    /* localStorage non disponibile: niente ricreazione automatica */
  }
}

function pushChoice(): string | null {
  try {
    return localStorage.getItem(PUSH_CHOICE_KEY);
  } catch {
    return null;
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Crea l'iscrizione con la chiave VAPID del server. */
export async function createPushSubscription(
  reg: ServiceWorkerRegistration
): Promise<PushSubscription> {
  const keyRes = await fetch("/api/push/vapid-public-key");
  if (!keyRes.ok) throw new Error("vapid");
  const { key } = (await keyRes.json()) as { key: string };
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
}

/** Salva l'iscrizione sul server, legata all'utente collegato (se c'è). */
export async function savePushSubscription(sub: PushSubscription): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

export async function syncPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (pushChoice() === "off") return;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    // Ricreata solo se l'utente le aveva attivate da qui: chi non ha mai
    // scelto (permesso dato per altro) non si ritrova iscritto da solo.
    if (pushChoice() !== "on") return;
    sub = await createPushSubscription(reg);
  }
  await savePushSubscription(sub);
}
