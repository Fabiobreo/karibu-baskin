/**
 * Quando proporre l'installazione dell'app (banner `InstallPrompt`).
 *
 * Lo stato sta in `localStorage`, quindi e' uno solo per tutte le pagine e
 * tutte le schede del browser: il banner non riparte da zero a ogni
 * caricamento. Conta le volte in cui e' comparso, non solo i rifiuti: chi lo
 * ignora senza chiuderlo non se lo ritrova a ogni pagina.
 */

export const INSTALL_STATE_KEY = "kb-install-prompt";
/** Chiave di prima (solo il momento del rifiuto): si legge per non ripartire da zero. */
export const LEGACY_DISMISS_KEY = "kb-install-dismissed";

/** Dopo un rifiuto esplicito ("Più tardi", la X) non si ripropone per 30 giorni. */
export const DISMISS_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
/** Fra una comparsa e la successiva passano almeno 7 giorni, anche se e' stato ignorato. */
export const SHOW_GAP_MS = 7 * 24 * 60 * 60 * 1000;
/** Dopo tre comparse non si insiste piu': l'installazione resta nel menu del browser. */
export const MAX_SHOWS = 3;

export interface InstallPromptState {
  /** Quante volte il banner e' comparso. */
  shows: number;
  lastShownAt: number | null;
  dismissedAt: number | null;
}

const EMPTY: InstallPromptState = { shows: 0, lastShownAt: null, dismissedAt: null };

const timestamp = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

/** Stato salvato; un valore mancante o illeggibile vale "mai mostrato". */
export function parseInstallState(
  raw: string | null,
  legacyDismissedAt?: string | null
): InstallPromptState {
  if (raw) {
    try {
      const data = JSON.parse(raw) as Partial<InstallPromptState> | null;
      if (data && typeof data === "object") {
        const shows = Number.isInteger(data.shows) && data.shows! > 0 ? data.shows! : 0;
        return {
          shows,
          lastShownAt: timestamp(data.lastShownAt),
          dismissedAt: timestamp(data.dismissedAt),
        };
      }
    } catch {
      /* valore corrotto: si riparte da vuoto */
    }
  }
  const legacy = timestamp(Number(legacyDismissedAt));
  return legacy ? { shows: 1, lastShownAt: legacy, dismissedAt: legacy } : { ...EMPTY };
}

export function canShowInstallPrompt(state: InstallPromptState, now: number): boolean {
  if (state.shows >= MAX_SHOWS) return false;
  if (state.dismissedAt !== null && now - state.dismissedAt < DISMISS_SNOOZE_MS) return false;
  if (state.lastShownAt !== null && now - state.lastShownAt < SHOW_GAP_MS) return false;
  return true;
}

export function recordShown(state: InstallPromptState, now: number): InstallPromptState {
  return { ...state, shows: state.shows + 1, lastShownAt: now };
}

/** Evento con cui Chrome e Android offrono l'installazione (non standard). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Il layout radice salva qui l'evento, che puo' arrivare prima dell'idratazione. */
export type InstallPromptWindow = Window & { __kbInstallPrompt?: BeforeInstallPromptEvent | null };

/**
 * Apre la finestra di installazione del browser. Un evento si puo' usare una
 * volta sola e lo condividono il banner e la guida: chi lo usa lo toglie da
 * `window`, e un evento gia' usato dall'altro non solleva.
 */
export async function runInstallPrompt(
  event: BeforeInstallPromptEvent
): Promise<"accepted" | "dismissed" | "unavailable"> {
  const w = window as InstallPromptWindow;
  if (w.__kbInstallPrompt === event) w.__kbInstallPrompt = null;
  try {
    await event.prompt();
    return (await event.userChoice).outcome;
  } catch {
    return "unavailable";
  }
}

/** Safari su iPhone o iPad: l'installazione si fa a mano, dal menu Condividi. */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  // Esclude i browser in-app (Instagram, Facebook, ecc.) dove l'installazione non esiste
  return !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line|Twitter/.test(ua);
}

export function recordDismissed(state: InstallPromptState, now: number): InstallPromptState {
  return { ...state, dismissedAt: now };
}
