import { describe, it, expect } from "vitest";
import { checkRateLimit, getClientIp } from "./rateLimit";

describe("checkRateLimit", () => {
  it("consente le prime N richieste entro la finestra", () => {
    const ip = `test-ip-${Date.now()}-allow`;
    for (let i = 1; i <= 5; i++) {
      const result = checkRateLimit(ip, "test-allow", 5, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i);
    }
  });

  it("blocca la richiesta che supera il limite", () => {
    const ip = `test-ip-${Date.now()}-block`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, "test-block", 3, 60_000);
    }
    const overLimit = checkRateLimit(ip, "test-block", 3, 60_000);
    expect(overLimit.allowed).toBe(false);
    expect(overLimit.remaining).toBe(0);
  });

  it("isola chiavi diverse per lo stesso IP", () => {
    const ip = `test-ip-${Date.now()}-keys`;
    for (let i = 0; i < 3; i++) checkRateLimit(ip, "key-a", 3, 60_000);
    // key-a è esaurita, key-b è ancora libera
    const resultA = checkRateLimit(ip, "key-a", 3, 60_000);
    const resultB = checkRateLimit(ip, "key-b", 3, 60_000);
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it("isola IP diversi per la stessa chiave", () => {
    const ts = Date.now();
    const ip1 = `test-ip-${ts}-ip1`;
    const ip2 = `test-ip-${ts}-ip2`;
    for (let i = 0; i < 3; i++) checkRateLimit(ip1, "key-ips", 3, 60_000);
    const resultIp1 = checkRateLimit(ip1, "key-ips", 3, 60_000);
    const resultIp2 = checkRateLimit(ip2, "key-ips", 3, 60_000);
    expect(resultIp1.allowed).toBe(false);
    expect(resultIp2.allowed).toBe(true);
  });

  it("scarta timestamp fuori dalla finestra temporale", async () => {
    const ip = `test-ip-${Date.now()}-window`;
    // Simula 3 richieste con una finestra di 50ms
    checkRateLimit(ip, "test-window", 3, 50);
    checkRateLimit(ip, "test-window", 3, 50);
    checkRateLimit(ip, "test-window", 3, 50);
    // Dopo la scadenza, i timestamp precedenti vengono scartati
    await new Promise((r) => setTimeout(r, 60));
    const result = checkRateLimit(ip, "test-window", 3, 50);
    expect(result.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  const makeReq = (headerValue: string | null) => ({
    headers: { get: (k: string) => (k === "x-forwarded-for" ? headerValue : null) },
  });

  it("estrae il primo IP dall'header X-Forwarded-For", () => {
    expect(getClientIp(makeReq("1.2.3.4, 5.6.7.8"))).toBe("1.2.3.4");
  });

  it("restituisce 'unknown' se l'header è assente", () => {
    expect(getClientIp(makeReq(null))).toBe("unknown");
  });

  it("gestisce un singolo IP senza virgole", () => {
    expect(getClientIp(makeReq("9.9.9.9"))).toBe("9.9.9.9");
  });
});
