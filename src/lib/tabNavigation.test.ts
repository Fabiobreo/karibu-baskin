import { describe, expect, it } from "vitest";
import { tabNavigationAction } from "./tabNavigation";

describe("tabNavigationAction", () => {
  it("nel browser aggiunge sempre una voce", () => {
    expect(
      tabNavigationAction({
        standalone: false,
        currentPath: "/calendario",
        target: "/allenamenti",
        previousPath: "/",
      })
    ).toEqual({ kind: "push", href: "/allenamenti" });
    expect(
      tabNavigationAction({
        standalone: false,
        currentPath: "/calendario",
        target: "/",
        previousPath: "/",
      })
    ).toEqual({ kind: "push", href: "/" });
  });

  it("nell'app, dalla Home a una scheda aggiunge una voce", () => {
    expect(
      tabNavigationAction({
        standalone: true,
        currentPath: "/",
        target: "/calendario",
        previousPath: null,
      })
    ).toEqual({ kind: "push", href: "/calendario" });
  });

  it("nell'app, fra due schede sostituisce la voce corrente", () => {
    expect(
      tabNavigationAction({
        standalone: true,
        currentPath: "/allenamenti",
        target: "/calendario",
        previousPath: "/",
      })
    ).toEqual({ kind: "replace", href: "/calendario" });
  });

  it("nell'app, da una pagina interna a una scheda sostituisce la voce corrente", () => {
    expect(
      tabNavigationAction({
        standalone: true,
        currentPath: "/partite/vs-rossi",
        target: "/notifiche",
        previousPath: "/partite",
      })
    ).toEqual({ kind: "replace", href: "/notifiche" });
  });

  it("nell'app, alla Home torna indietro se la voce precedente è la Home", () => {
    expect(
      tabNavigationAction({
        standalone: true,
        currentPath: "/calendario",
        target: "/",
        previousPath: "/",
      })
    ).toEqual({ kind: "back" });
  });

  it("nell'app, alla Home sostituisce la voce se sotto non c'è la Home", () => {
    // Aperta da una notifica su una partita: sotto non c'è nulla.
    expect(
      tabNavigationAction({
        standalone: true,
        currentPath: "/partite/vs-rossi",
        target: "/",
        previousPath: null,
      })
    ).toEqual({ kind: "replace", href: "/" });
    expect(
      tabNavigationAction({
        standalone: true,
        currentPath: "/allenamento/abc",
        target: "/",
        previousPath: "/allenamenti",
      })
    ).toEqual({ kind: "replace", href: "/" });
  });
});
