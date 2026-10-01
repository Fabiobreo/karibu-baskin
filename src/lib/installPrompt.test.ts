import { describe, expect, it } from "vitest";
import {
  DISMISS_SNOOZE_MS,
  MAX_SHOWS,
  SHOW_GAP_MS,
  canShowInstallPrompt,
  parseInstallState,
  recordDismissed,
  recordShown,
} from "./installPrompt";

const NOW = Date.UTC(2026, 9, 1);
const DAY = 24 * 60 * 60 * 1000;

describe("stato del banner di installazione", () => {
  it("senza niente di salvato vale 'mai mostrato'", () => {
    expect(parseInstallState(null)).toEqual({ shows: 0, lastShownAt: null, dismissedAt: null });
    expect(canShowInstallPrompt(parseInstallState(null), NOW)).toBe(true);
  });

  it("un valore corrotto non rompe niente", () => {
    for (const raw of ["{", "null", '"x"', '{"shows":"tre","lastShownAt":-1}']) {
      expect(parseInstallState(raw)).toEqual({ shows: 0, lastShownAt: null, dismissedAt: null });
    }
  });

  it("rilegge il rifiuto salvato con la chiave di prima", () => {
    const state = parseInstallState(null, String(NOW - DAY));
    expect(state).toEqual({ shows: 1, lastShownAt: NOW - DAY, dismissedAt: NOW - DAY });
    expect(canShowInstallPrompt(state, NOW)).toBe(false);
  });

  it("lo stato nuovo vince sulla chiave di prima", () => {
    const raw = JSON.stringify({ shows: 2, lastShownAt: NOW, dismissedAt: null });
    expect(parseInstallState(raw, String(NOW - DAY)).shows).toBe(2);
  });
});

describe("quando proporre l'installazione", () => {
  it("non ricompare a ogni pagina: dopo una comparsa aspetta sette giorni", () => {
    const shown = recordShown(parseInstallState(null), NOW);
    expect(canShowInstallPrompt(shown, NOW + 60_000)).toBe(false);
    expect(canShowInstallPrompt(shown, NOW + SHOW_GAP_MS - 1)).toBe(false);
    expect(canShowInstallPrompt(shown, NOW + SHOW_GAP_MS)).toBe(true);
  });

  it("dopo un rifiuto aspetta trenta giorni", () => {
    const dismissed = recordDismissed(recordShown(parseInstallState(null), NOW), NOW);
    expect(canShowInstallPrompt(dismissed, NOW + SHOW_GAP_MS)).toBe(false);
    expect(canShowInstallPrompt(dismissed, NOW + DISMISS_SNOOZE_MS)).toBe(true);
  });

  it("dopo tre comparse non insiste piu'", () => {
    let state = parseInstallState(null);
    for (let i = 0; i < MAX_SHOWS; i++) state = recordShown(state, NOW + i * SHOW_GAP_MS);
    expect(state.shows).toBe(MAX_SHOWS);
    expect(canShowInstallPrompt(state, NOW + 365 * DAY)).toBe(false);
  });

  it("lo stato passa intero da una scheda all'altra", () => {
    const saved = JSON.stringify(recordShown(parseInstallState(null), NOW));
    expect(canShowInstallPrompt(parseInstallState(saved), NOW + DAY)).toBe(false);
  });
});
