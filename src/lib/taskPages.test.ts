import { describe, expect, it } from "vitest";
import { isTaskPath } from "./taskPages";

describe("isTaskPath", () => {
  it("riconosce le pagine dove si fa un compito", () => {
    for (const p of [
      "/login",
      "/login/verifica",
      "/profilo",
      "/profilo/disponibilita",
      "/notifiche",
      "/allenamento/202610021830",
    ]) {
      expect(isTaskPath(p)).toBe(true);
    }
  });

  it("le pagine di contenuto no: li' il nastro scorre", () => {
    // `/allenamenti` e' la lista, non il modulo d'iscrizione.
    for (const p of ["/", "/allenamenti", "/partite", "/news/una-notizia", "/sponsor", null]) {
      expect(isTaskPath(p)).toBe(false);
    }
  });
});
