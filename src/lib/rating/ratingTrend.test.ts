import { describe, it, expect } from "vitest";
import { curveScale, curveStatus, dataLevel, recentTrend, type CurvePoint } from "./ratingTrend";

const game = (mu: number, kind: CurvePoint["kind"] = "training"): CurvePoint => ({
  mu,
  sigma: 6,
  kind,
});

describe("curveStatus / dataLevel", () => {
  it("nessuna partita → senza dati", () => {
    expect(curveStatus(0)).toBe("senza");
    expect(dataLevel(0)).toBe(0);
  });

  it("meno di 4 partite → in formazione", () => {
    expect(curveStatus(3)).toBe("formazione");
    expect(dataLevel(3)).toBe(1);
  });

  it("da 4 partite la curva si legge, da 10 i dati sono pieni", () => {
    expect(curveStatus(4)).toBe("leggibile");
    expect(dataLevel(9)).toBe(2);
    expect(dataLevel(10)).toBe(3);
  });
});

describe("recentTrend", () => {
  it("meno di 4 partite → nessun trend", () => {
    expect(recentTrend([game(26), game(27), game(28)], 25)).toBeNull();
  });

  it("i cambi di ruolo non contano come partite", () => {
    const pts = [game(26), game(27), game(28), game(28, "other")];
    expect(recentTrend(pts, 25)).toBeNull();
  });

  it("guarda solo le ultime partite: scesa e poi risalita → in salita", () => {
    // La retta su tutta la serie è piatta, ma le ultime 4 salgono.
    const pts = [30, 28, 26, 24, 22, 23, 25, 27, 29].map((m) => game(m));
    expect(recentTrend(pts, 25)).toEqual({ label: "salita", window: 4 });
  });

  it("calo nelle ultime partite → in calo", () => {
    const pts = [25, 26, 27, 25, 24, 23, 22].map((m) => game(m));
    expect(recentTrend(pts, 25)?.label).toBe("calo");
  });

  it("oscillazioni piccole → stabile", () => {
    const pts = [25, 25.5, 24.8, 25.3, 25.1].map((m) => game(m));
    expect(recentTrend(pts, 25)?.label).toBe("stabile");
  });

  it("una correzione a mano nella finestra non fa trend", () => {
    const pts = [game(25), game(25.2), game(25, "other"), game(28, "other"), game(28.3), game(28)];
    expect(recentTrend(pts, 25)?.label).toBe("stabile");
  });

  it("con la stima incerta serve una variazione più grande", () => {
    const uncertain = (mu: number): CurvePoint => ({ mu, sigma: 8, kind: "training" });
    // +2,5 in 4 partite: trend con σ 6 (soglia 2,4), rumore con σ 8 (soglia 3,2).
    expect(
      recentTrend(
        [25, 25.5, 26, 27, 27.5].map((m) => game(m)),
        25
      )?.label
    ).toBe("salita");
    expect(recentTrend([25, 25.5, 26, 27, 27.5].map(uncertain), 25)?.label).toBe("stabile");
  });

  it("con solo 4 partite parte dal livello iniziale", () => {
    const pts = [26, 27, 27.5, 28].map((m) => game(m));
    expect(recentTrend(pts, 25)?.label).toBe("salita");
  });
});

describe("curveScale", () => {
  it("min e max su tutta la rosa, con margine", () => {
    const s = curveScale([[game(20), game(22)], [game(30)]]);
    expect(s!.min).toBeLessThan(20);
    expect(s!.max).toBeGreaterThan(30);
  });

  it("senza punti → null", () => {
    expect(curveScale([[], []])).toBeNull();
  });

  it("un solo valore non dà una scala piatta", () => {
    const s = curveScale([[game(25)]]);
    expect(s!.max - s!.min).toBeGreaterThan(0);
  });
});
