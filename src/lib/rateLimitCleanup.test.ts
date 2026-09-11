import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit, rateLimitStoreSize } from "./rateLimit";

/**
 * Pulizia della mappa del rate limiter (KB-23).
 *
 * File separato da rateLimit.test.ts: ogni file di test ha il suo modulo, e qui
 * serve una mappa che parta vuota per contare le chiavi con precisione.
 */
describe("rate limiter · pulizia della memoria", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("libera le chiavi scadute anche se nessuno le interroga più", () => {
    vi.useFakeTimers();
    const t0 = Date.now() + 10 * 60_000;
    vi.setSystemTime(t0);

    // Cinquanta IP visti una volta sola: il caso che prima restava in memoria.
    for (let i = 0; i < 50; i++) checkRateLimit(`10.9.0.${i}`, "once", 5, 60_000);
    expect(rateLimitStoreSize()).toBe(50);

    // Oltre la loro finestra e oltre l'intervallo di pulizia, un'altra richiesta
    // qualunque fa partire la pulizia.
    vi.setSystemTime(t0 + 2 * 60_000);
    checkRateLimit("10.9.9.9", "trigger", 5, 60_000);
    expect(rateLimitStoreSize()).toBe(1);
  });

  it("conserva le chiavi che hanno ancora richieste nella propria finestra", () => {
    vi.useFakeTimers();
    const t0 = Date.now() + 60 * 60_000;
    vi.setSystemTime(t0);

    checkRateLimit("10.8.0.1", "lunga", 5, 10 * 60_000);
    checkRateLimit("10.8.0.2", "breve", 5, 60_000);

    vi.setSystemTime(t0 + 2 * 60_000);
    checkRateLimit("10.8.9.9", "trigger-2", 5, 60_000);

    // "lunga" è ancora nella sua finestra da 10 minuti, "breve" no. Resta anche
    // la chiave del primo test, scaduta ma ormai fuori dall'intervallo di questa pulizia.
    const blocked = [0, 1, 2, 3, 4].map(() => checkRateLimit("10.8.0.1", "lunga", 5, 10 * 60_000));
    expect(blocked.at(-1)?.allowed).toBe(false);
  });
});
