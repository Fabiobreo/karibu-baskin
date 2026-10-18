import { afterEach, describe, expect, it, vi } from "vitest";
import it_ from "@/i18n/messages/it.json";
import { NETWORK_ERROR_IT, errorText, isNetworkError } from "./networkError";

afterEach(() => vi.unstubAllGlobals());

describe("isNetworkError", () => {
  it("riconosce i TypeError di fetch di Chrome, Firefox e Safari", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new TypeError("NetworkError when attempting to fetch resource."))).toBe(
      true
    );
    expect(isNetworkError(new TypeError("Load failed"))).toBe(true);
    expect(isNetworkError(new TypeError("The Internet connection appears to be offline."))).toBe(
      true
    );
    expect(isNetworkError(new TypeError("The network connection was lost."))).toBe(true);
  });

  it("non scambia un TypeError di codice per la rete", () => {
    expect(isNetworkError(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(isNetworkError(new Error("Allenamento non trovato"))).toBe(false);
  });

  it("senza connessione qualunque errore è di rete", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isNetworkError(new Error("qualcosa"))).toBe(true);
  });
});

describe("errorText", () => {
  it("senza rete dice sempre la stessa frase", () => {
    expect(errorText(new TypeError("Failed to fetch"), "Salvataggio non riuscito")).toBe(
      NETWORK_ERROR_IT
    );
    expect(errorText(new TypeError("Load failed"), "x", "You're offline.")).toBe("You're offline.");
  });

  it("altrimenti il messaggio dell'errore, o il ripiego", () => {
    expect(errorText(new Error("Nome già in uso"), "x")).toBe("Nome già in uso");
    expect(errorText(new Error(""), "Salvataggio non riuscito")).toBe("Salvataggio non riuscito");
    expect(errorText("boh", "Salvataggio non riuscito")).toBe("Salvataggio non riuscito");
  });

  it("la frase dell'area staff è quella del dizionario italiano", () => {
    expect(NETWORK_ERROR_IT).toBe(it_.common.networkError);
  });
});
