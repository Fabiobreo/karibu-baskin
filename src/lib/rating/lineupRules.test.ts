import { describe, it, expect } from "vitest";
import {
  validateLineup,
  isLineupValid,
  canAddToLineup,
  type LineupPlayerLike,
} from "./lineupRules";

// Helper compatto per costruire un giocatore.
const p = (
  sportRole: number | null,
  gender: LineupPlayerLike["gender"] = "MALE"
): LineupPlayerLike => ({
  sportRole,
  gender,
});

// Formazione valida di riferimento: 1 guardia (R1), somma 1+3+3+4+5+5 = 21 ≤ 23,
// tra R4/R5 c'è almeno una donna e un uomo.
const validSix: LineupPlayerLike[] = [
  p(1, "MALE"),
  p(3, "MALE"),
  p(3, "FEMALE"),
  p(4, "FEMALE"),
  p(5, "MALE"),
  p(5, "FEMALE"),
];

describe("validateLineup", () => {
  it("accetta una formazione regolare", () => {
    const r = validateLineup(validSix);
    expect(r.valid).toBe(true);
    expect(r.full).toBe(true);
    expect(r.oneGuard).toBe(true);
    expect(r.roleSumOk).toBe(true);
    expect(r.genderMix).toBe(true);
    expect(r.hasThree).toBe(true);
    expect(r.twoFives).toBe(true);
    expect(r.roleSum).toBe(21);
  });

  it("richiede almeno un ruolo 3", () => {
    // 6 giocatori, 1 guardia, somma 23, 2 R5, mix genere — ma nessun R3.
    const noThree = [
      p(1),
      p(4, "FEMALE"),
      p(4, "MALE"),
      p(4, "FEMALE"),
      p(5, "MALE"),
      p(5, "FEMALE"),
    ];
    const r = validateLineup(noThree);
    expect(r.hasThree).toBe(false);
    expect(r.valid).toBe(false);
    // gli altri vincoli sono soddisfatti → isola hasThree
    expect(r.oneGuard).toBe(true);
    expect(r.roleSumOk).toBe(true);
    expect(r.genderMix).toBe(true);
    expect(r.twoFives).toBe(true);
  });

  it("richiede almeno due ruoli 5", () => {
    // 6 giocatori, 1 guardia, un R3, mix genere — ma un solo R5.
    const oneFive = [p(1), p(3), p(3, "FEMALE"), p(4, "MALE"), p(4, "FEMALE"), p(5, "FEMALE")];
    const r = validateLineup(oneFive);
    expect(r.twoFives).toBe(false);
    expect(r.valid).toBe(false);
    expect(r.hasThree).toBe(true);
    expect(r.oneGuard).toBe(true);
  });

  it("richiede esattamente 6 giocatori", () => {
    expect(validateLineup(validSix.slice(0, 5)).full).toBe(false);
    expect(validateLineup(validSix.slice(0, 5)).valid).toBe(false);
  });

  it("richiede esattamente una guardia (ruolo 1 o 2)", () => {
    const noGuard = [p(3), p(3), p(3), p(4, "FEMALE"), p(5), p(5, "FEMALE")];
    expect(validateLineup(noGuard).oneGuard).toBe(false);
    const twoGuards = [p(1), p(2), p(3), p(4, "FEMALE"), p(5), p(5, "FEMALE")];
    expect(validateLineup(twoGuards).oneGuard).toBe(false);
  });

  it("respinge somma ruoli > 23", () => {
    const heavy = [
      p(2),
      p(4, "FEMALE"),
      p(4, "MALE"),
      p(5, "FEMALE"),
      p(5, "MALE"),
      p(5, "FEMALE"),
    ];
    const r = validateLineup(heavy);
    expect(r.roleSum).toBe(25);
    expect(r.roleSumOk).toBe(false);
    expect(r.valid).toBe(false);
  });

  it("richiede mix di genere tra ruoli 4 e 5", () => {
    const allMaleHigh = [p(1), p(3), p(3), p(4, "MALE"), p(5, "MALE"), p(5, "MALE")];
    expect(validateLineup(allMaleHigh).genderMix).toBe(false);
    const allFemaleHigh = [p(1), p(3), p(3), p(4, "FEMALE"), p(5, "FEMALE"), p(5, "FEMALE")];
    expect(validateLineup(allFemaleHigh).genderMix).toBe(false);
  });

  it("il vincolo di genere è vacuo senza ruoli 4/5", () => {
    const lowOnly = [p(1), p(2), p(3), p(3), p(3), p(3)];
    // 2 guardie qui → oneGuard false, ma genderMix deve essere true (vacuo)
    expect(validateLineup(lowOnly).genderMix).toBe(true);
  });

  it("isLineupValid coincide con validateLineup().valid", () => {
    expect(isLineupValid(validSix)).toBe(true);
    expect(isLineupValid(validSix.slice(0, 4))).toBe(false);
  });
});

describe("canAddToLineup", () => {
  it("permette di aggiungere a una formazione vuota", () => {
    expect(canAddToLineup([], p(1))).toBe(true);
    expect(canAddToLineup([], p(5, "FEMALE"))).toBe(true);
  });

  it("blocca la seconda guardia (ruolo 1 o 2)", () => {
    expect(canAddToLineup([p(1)], p(2))).toBe(false);
    expect(canAddToLineup([p(2)], p(1))).toBe(false);
    // un non-guardia resta ammesso
    expect(canAddToLineup([p(1)], p(3))).toBe(true);
  });

  it("blocca se la somma ruoli supererebbe 23", () => {
    // somma corrente 20, aggiungere un R4 → 24 > 23
    const current = [p(5, "FEMALE"), p(5, "MALE"), p(5, "FEMALE"), p(5, "MALE")];
    expect(current.reduce((s, x) => s + (x.sportRole ?? 0), 0)).toBe(20);
    expect(canAddToLineup(current, p(4, "FEMALE"))).toBe(false);
    expect(canAddToLineup(current, p(3))).toBe(true); // 23, ok
  });

  it("blocca il 6° giocatore se completerebbe una formazione non valida", () => {
    // 5 giocatori senza guardia (1 R3, 2 R5): il 6° non-guardia lascerebbe 0
    // guardie → invalido; la guardia mancante invece completa valido.
    const noGuard5 = [p(3), p(4, "FEMALE"), p(4, "MALE"), p(5, "FEMALE"), p(5, "MALE")];
    expect(canAddToLineup(noGuard5, p(3))).toBe(false);
    expect(canAddToLineup(noGuard5, p(1))).toBe(true);
  });

  it("blocca il 6° giocatore se lascerebbe meno di 2 ruoli 5", () => {
    // 5 giocatori con un solo R5: il 6° deve essere un R5, altrimenti invalido.
    const oneFive5 = [p(1), p(3), p(3, "FEMALE"), p(4, "MALE"), p(5, "FEMALE")];
    expect(canAddToLineup(oneFive5, p(3))).toBe(false);
    expect(canAddToLineup(oneFive5, p(5, "MALE"))).toBe(true);
  });

  it("blocca il 6° giocatore se romperebbe il mix di genere tra R4/R5", () => {
    // 5 con un solo genere in alto: il 6° R5 stesso genere → niente mix
    const oneGenderHigh = [p(1), p(3), p(4, "MALE"), p(5, "MALE"), p(5, "MALE")];
    expect(canAddToLineup(oneGenderHigh, p(5, "MALE"))).toBe(false);
    expect(canAddToLineup(oneGenderHigh, p(5, "FEMALE"))).toBe(true);
  });

  it("blocca quando la formazione è già completa", () => {
    expect(canAddToLineup(validSix, p(3))).toBe(false);
  });
});
