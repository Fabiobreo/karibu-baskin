import { describe, expect, it } from "vitest";
import { loginHref, safeCallbackPath } from "./loginReturn";

describe("safeCallbackPath", () => {
  it("accetta i percorsi interni", () => {
    expect(safeCallbackPath("/allenamento/abc")).toBe("/allenamento/abc");
    expect(safeCallbackPath("/marcatori?season=2025-26#top")).toBe("/marcatori?season=2025-26#top");
  });

  it("ricade sulla home senza parametro", () => {
    expect(safeCallbackPath(undefined)).toBe("/");
    expect(safeCallbackPath(null)).toBe("/");
    expect(safeCallbackPath("")).toBe("/");
  });

  it("prende il primo valore se il parametro è ripetuto", () => {
    expect(safeCallbackPath(["/profilo", "https://evil.example"])).toBe("/profilo");
  });

  it("rifiuta gli indirizzi verso altri siti", () => {
    expect(safeCallbackPath("https://evil.example")).toBe("/");
    expect(safeCallbackPath("//evil.example")).toBe("/");
    expect(safeCallbackPath("/\\evil.example")).toBe("/");
    expect(safeCallbackPath("javascript:alert(1)")).toBe("/");
    expect(safeCallbackPath("allenamento/abc")).toBe("/");
    expect(safeCallbackPath("/\tevil")).toBe("/");
  });
});

describe("loginHref", () => {
  it("aggiunge il ritorno codificato", () => {
    expect(loginHref("/allenamento/abc")).toBe("/login?callbackUrl=%2Fallenamento%2Fabc");
  });

  it("senza ritorno utile porta al login semplice", () => {
    expect(loginHref("/")).toBe("/login");
    expect(loginHref("https://evil.example")).toBe("/login");
  });
});
