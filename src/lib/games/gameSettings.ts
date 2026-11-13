import type { AppRole, GameVisibility } from "@prisma/client";
import { isMemberRole, isStaffRole } from "@/lib/authRoles";

/**
 * Chi vede i giochi del club (UX-66). L'admin decide lo stato di ogni gioco in
 * `/admin/giochi`, ma ogni gioco ha un limite che il pannello non può superare:
 * il pronostico vuole un account per essere salvato, il simulatore mostra le
 * rose vere, minori compresi. Solo il quiz può essere per tutti.
 */

export const GAME_KEYS = ["quiz", "prediction", "simulator"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export type GameSettings = Record<GameKey, GameVisibility>;

interface GameRule {
  /** Stati che l'admin può scegliere, nell'ordine in cui il pannello li mostra. */
  allowed: readonly GameVisibility[];
  /** Stato quando il gioco non ha ancora una riga nel database. */
  fallback: GameVisibility;
}

export const GAME_RULES: Record<GameKey, GameRule> = {
  // Spento finché il club non ha riletto le domande (era `QUIZ_READY`).
  quiz: { allowed: ["OFF", "MEMBERS", "PUBLIC"], fallback: "OFF" },
  prediction: { allowed: ["OFF", "MEMBERS"], fallback: "MEMBERS" },
  simulator: { allowed: ["OFF", "MEMBERS"], fallback: "MEMBERS" },
};

export function isGameKey(value: unknown): value is GameKey {
  return typeof value === "string" && (GAME_KEYS as readonly string[]).includes(value);
}

export function isAllowedVisibility(game: GameKey, visibility: unknown): boolean {
  return (GAME_RULES[game].allowed as readonly unknown[]).includes(visibility);
}

/**
 * Lo stato di ogni gioco dalle righe salvate. Un gioco senza riga, o con uno
 * stato che non gli è più permesso, prende il suo default: un errore nel
 * database non deve mai rendere pubblico il simulatore.
 */
export function resolveGameSettings(
  rows: readonly { game: string; visibility: GameVisibility }[]
): GameSettings {
  const settings = Object.fromEntries(
    GAME_KEYS.map((key) => [key, GAME_RULES[key].fallback])
  ) as GameSettings;
  for (const row of rows) {
    if (isGameKey(row.game) && isAllowedVisibility(row.game, row.visibility)) {
      settings[row.game] = row.visibility;
    }
  }
  return settings;
}

/**
 * Cosa può fare chi guarda con un gioco:
 * - `play`: lo gioca;
 * - `preview`: è spento, ma allenatori e admin lo provano in anteprima;
 * - `members`: è dei tesserati e chi guarda non lo è (anonimo o ospite);
 * - `hidden`: spento.
 */
export type GameAccess = "play" | "preview" | "members" | "hidden";

export function gameAccess(
  visibility: GameVisibility,
  role: AppRole | string | null | undefined
): GameAccess {
  if (isStaffRole(role as AppRole | null | undefined)) {
    return visibility === "OFF" ? "preview" : "play";
  }
  if (visibility === "OFF") return "hidden";
  if (visibility === "PUBLIC") return "play";
  return isMemberRole(role) ? "play" : "members";
}

/** Vero se chi guarda gioca (anche in anteprima). */
export function canPlay(access: GameAccess): boolean {
  return access === "play" || access === "preview";
}

/**
 * La voce "Giochi" del menu: c'è se chi guarda ne può giocare almeno uno, senza
 * contare l'anteprima dello staff (il menu è quello del sito, non del pannello).
 */
export function showsGamesInMenu(
  settings: GameSettings,
  role: AppRole | string | null | undefined
): boolean {
  return GAME_KEYS.some((key) => gameAccess(settings[key], role) === "play");
}

/** `/giochi` e il quiz entrano in sitemap e si indicizzano solo con il quiz per tutti. */
export function gamesAreIndexable(settings: GameSettings): boolean {
  return settings.quiz === "PUBLIC";
}

/** Le parole dello stato, nel pannello (solo italiano). */
export const GAME_VISIBILITY_LABELS: Record<GameVisibility, string> = {
  OFF: "Spento",
  MEMBERS: "Solo tesserati",
  PUBLIC: "Per tutti",
};
