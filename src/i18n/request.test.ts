import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * La lingua dipende solo dal cookie. Un URL senza cookie deve essere sempre
 * italiano: è ciò che vedono crawler e anteprime social, e la stessa risorsa
 * non deve cambiare lingua in base all'header `Accept-Language` di chi la
 * chiede (vedi il commento in request.ts).
 */

const mocks = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  headers: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  // Restituisce la funzione di configurazione così com'è, per poterla chiamare.
  getRequestConfig: (fn: unknown) => fn,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "karibu-locale" && mocks.cookie !== undefined ? { value: mocks.cookie } : undefined,
  })),
  // Se request.ts tornasse a leggere gli header, questo mock lo farebbe notare.
  headers: mocks.headers.mockImplementation(
    async () => new Headers({ "accept-language": "en-US,en;q=0.9" })
  ),
}));

import requestConfig from "./request";

const resolve = requestConfig as unknown as () => Promise<{ locale: string; messages: object }>;

beforeEach(() => {
  mocks.cookie = undefined;
  mocks.headers.mockClear();
});

describe("i18n · lingua della richiesta", () => {
  it("senza cookie è italiano, anche con un browser in inglese", async () => {
    const { locale } = await resolve();
    expect(locale).toBe("it");
  });

  it("non consulta Accept-Language", async () => {
    await resolve();
    expect(mocks.headers).not.toHaveBeenCalled();
  });

  it("rispetta la preferenza esplicita salvata nel cookie", async () => {
    mocks.cookie = "en";
    const { locale } = await resolve();
    expect(locale).toBe("en");
  });

  it("ignora un cookie con una lingua non supportata", async () => {
    mocks.cookie = "fr";
    const { locale } = await resolve();
    expect(locale).toBe("it");
  });

  it("carica i messaggi della lingua scelta", async () => {
    mocks.cookie = "en";
    const { messages } = await resolve();
    expect(messages).toHaveProperty("common.retry", "Try again");
  });
});
