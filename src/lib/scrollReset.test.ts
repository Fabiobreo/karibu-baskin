import { describe, it, expect } from "vitest";
import { shouldScrollToTop } from "./scrollReset";

const nav = (over: Partial<Parameters<typeof shouldScrollToTop>[0]> = {}) =>
  shouldScrollToTop({
    previousPath: "/il-baskin",
    path: "/partite",
    poppedPath: null,
    hash: "",
    ...over,
  });

describe("shouldScrollToTop", () => {
  it("porta in cima quando si apre un'altra pagina", () => {
    expect(nav()).toBe(true);
    expect(nav({ hash: "#" })).toBe(true);
  });

  it("resta dov'è se cambiano solo i parametri", () => {
    expect(nav({ previousPath: "/allenamenti", path: "/allenamenti" })).toBe(false);
  });

  it("non tocca indietro e avanti: la posizione la rimette il browser", () => {
    expect(nav({ poppedPath: "/partite" })).toBe(false);
  });

  it("lascia fare al browser con un'ancora", () => {
    expect(nav({ path: "/contatti", hash: "#vieni-a-provare" })).toBe(false);
  });

  it("un indietro dentro un'altra pagina non blocca il clic successivo", () => {
    // Indietro su /guida (da un'ancora), poi un link verso /partite.
    expect(nav({ previousPath: "/guida", poppedPath: "/guida" })).toBe(true);
  });
});
