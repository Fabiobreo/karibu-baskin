import { describe, it, expect } from "vitest";
import { mergePrefs, DEFAULT_PREFS, type NotifPrefs } from "./notifPrefs";

describe("mergePrefs()", () => {
  it("null restituisce DEFAULT_PREFS", () => {
    expect(mergePrefs(null)).toEqual(DEFAULT_PREFS);
  });

  it("undefined restituisce DEFAULT_PREFS", () => {
    expect(mergePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });

  it("stringa restituisce DEFAULT_PREFS", () => {
    expect(mergePrefs("invalid")).toEqual(DEFAULT_PREFS);
  });

  it("oggetto vuoto restituisce DEFAULT_PREFS", () => {
    expect(mergePrefs({})).toEqual(DEFAULT_PREFS);
  });

  it("override parziale su push viene unito ai default", () => {
    const stored = { push: { NEW_TRAINING: false } };
    const result = mergePrefs(stored);
    expect(result.push.NEW_TRAINING).toBe(false);
    expect(result.push.TEAMS_READY).toBe(true); // default
    expect(result.push.MATCH_RESULT).toBe(true); // default
    expect(result.inApp).toEqual(DEFAULT_PREFS.inApp); // inApp invariato
  });

  it("override parziale su inApp viene unito ai default", () => {
    const stored = { inApp: { MATCH_RESULT: false } };
    const result = mergePrefs(stored);
    expect(result.inApp.MATCH_RESULT).toBe(false);
    expect(result.inApp.NEW_TRAINING).toBe(true);
    expect(result.inApp.TEAMS_READY).toBe(true);
    expect(result.push).toEqual(DEFAULT_PREFS.push);
  });

  it("override completo viene rispettato integralmente", () => {
    const stored: NotifPrefs = {
      push: { NEW_TRAINING: false, TEAMS_READY: false, MATCH_RESULT: false },
      inApp: { NEW_TRAINING: false, TEAMS_READY: true, MATCH_RESULT: false },
    };
    expect(mergePrefs(stored)).toEqual(stored);
  });

  it("chiavi extra nel payload vengono ignorate silenziosamente", () => {
    const stored = { push: { NEW_TRAINING: false }, extraKey: "ignored" };
    const result = mergePrefs(stored);
    expect((result as Record<string, unknown>).extraKey).toBeUndefined();
  });

  it("non muta DEFAULT_PREFS", () => {
    const original = JSON.parse(JSON.stringify(DEFAULT_PREFS));
    mergePrefs({ push: { NEW_TRAINING: false } });
    expect(DEFAULT_PREFS).toEqual(original);
  });
});
