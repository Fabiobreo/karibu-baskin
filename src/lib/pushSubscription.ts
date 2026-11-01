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

/**
 * All'uscita dall'account l'iscrizione del dispositivo si stacca dall'utente:
 * prima restava sua, e su un telefono condiviso (genitore e figlio) arrivavano
 * le sue notifiche, nomi compresi, anche a chi entrava dopo. L'iscrizione del
 * browser resta: al prossimo accesso `syncPushSubscription` la lega a chi entra.
 *
 * `getRegistration` e non `ready`: senza service worker (sviluppo) `ready` non
 * si risolve mai e bloccherebbe l'uscita.
 */
export async function releasePushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
}

/**
 * iPhone o iPad nel browser, fuori dall'app installata: lì le notifiche non
 * esistono (servono iOS 16.4 e l'app sulla schermata Home), qualunque sia il
 * browser.
 */
export function needsIosInstall(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}

/** Manda una notifica di prova a questo dispositivo. */
export async function sendTestPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  // Prima la si ripresenta: se il server l'aveva persa, la prova la ripara.
  if (!(await savePushSubscription(sub))) return false;
  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  if (!res.ok) return false;
  const { sent } = (await res.json()) as { sent: number };
  return sent > 0;
}
