import { describe, expect, it } from "vitest";
import { PICK_AND_SHOOT } from "@/lib/board/fixtures";
import type { DrillContent } from "@/lib/board/content";
import {
  DrillCreateSchema,
  EMPTY_DRILL_CONTENT,
  TrainingDrillsSchema,
  drillContentSchema,
  parseDrillContent,
} from "./drill";

const clone = (c: DrillContent): DrillContent => structuredClone(c);
const firstMessage = (court: "FULL" | "HALF", value: unknown) => {
  const r = drillContentSchema(court).safeParse(value);
  return r.success ? null : r.error.issues[0]?.message;
};

describe("drillContentSchema", () => {
  it("accetta lo schema di prova e quello vuoto", () => {
    expect(parseDrillContent(PICK_AND_SHOOT, "HALF")).not.toBeNull();
    expect(parseDrillContent(EMPTY_DRILL_CONTENT, "FULL")).not.toBeNull();
  });

  it("arrotonda le coordinate al centimetro", () => {
    const c = clone(PICK_AND_SHOOT);
    c.steps[0].at.a3 = { x: 20.123456, y: 4.009 };
    expect(parseDrillContent(c, "HALF")?.steps[0].at.a3).toEqual({ x: 20.12, y: 4.01 });
  });

  it("a meta' campo tiene i pezzi nella meta' di destra, a campo intero no", () => {
    const c = clone(PICK_AND_SHOOT);
    c.steps[1].at.a4 = { x: 10, y: 7 };
    expect(firstMessage("HALF", c)).toBe("Pezzo fuori dalla meta' campo");
    expect(firstMessage("FULL", c)).toBeNull();
  });

  it("a meta' campo si tira solo nei canestri di destra", () => {
    const c = clone(PICK_AND_SHOOT);
    c.steps[2].ball = { shot: "leftMain" };
    expect(firstMessage("HALF", c)).toMatch(/canestri di destra/);
    expect(firstMessage("FULL", c)).toBeNull();
  });

  it("vuole ogni pezzo in ogni passo, e nessun pezzo in piu'", () => {
    const missing = clone(PICK_AND_SHOOT);
    delete missing.steps[1].at.c1;
    expect(firstMessage("HALF", missing)).toMatch(/dove sta ogni pezzo/);
    const extra = clone(PICK_AND_SHOOT);
    extra.steps[1].at.zz = { x: 20, y: 5 };
    expect(firstMessage("HALF", extra)).toMatch(/dove sta ogni pezzo/);
  });

  it("la palla sta in mano a un giocatore in campo, mai a un cono", () => {
    const toCone = clone(PICK_AND_SHOOT);
    toCone.steps[0].ball = { holder: "c1" };
    expect(firstMessage("HALF", toCone)).toMatch(/in mano a un giocatore/);
    const offCourt = clone(PICK_AND_SHOOT);
    offCourt.steps[0].at.a4 = null;
    expect(firstMessage("HALF", offCourt)).toMatch(/in mano a un giocatore/);
  });

  it("controlla i campi di ogni tipo di pezzo", () => {
    const base = { v: 1, steps: [{ at: { p1: { x: 15, y: 5 } } }] };
    const msg = (piece: object) =>
      firstMessage("FULL", { ...base, pieces: [{ id: "p1", ...piece }] });
    expect(msg({ kind: "role", side: "attack" })).toBe("Ruolo non valido");
    expect(msg({ kind: "role", role: 3 })).toBe("Attacco o difesa non valido");
    expect(msg({ kind: "free", side: "attack", label: "ABC" })).toMatch(/una lettera o un numero/);
    expect(msg({ kind: "note" })).toBe("Scrivi il testo della nota");
    expect(msg({ kind: "cone", label: "x" })).toMatch(/Testo non previsto/);
    expect(msg({ kind: "coach" })).toBe("Allenatore non valido");
    expect(msg({ kind: "coach", coach: "tutor" })).toBeNull();
  });

  it("rifiuta codici doppi, il tiro al primo passo e troppi pezzi", () => {
    const dup = clone(PICK_AND_SHOOT);
    dup.pieces.push({ ...dup.pieces[0] });
    expect(firstMessage("HALF", dup)).toBe("Due pezzi con lo stesso codice");
    const shotFirst = clone(PICK_AND_SHOOT);
    shotFirst.steps[0].ball = { shot: "rightMain" };
    expect(firstMessage("HALF", shotFirst)).toMatch(/primo passo/);
    const many = {
      v: 1,
      pieces: Array.from({ length: 25 }, (_, i) => ({ id: `p${i}`, kind: "cone" })),
      steps: [{ at: {} }],
    };
    expect(firstMessage("FULL", many)).toBe("Al massimo 24 pezzi");
  });

  it("il blocco parte da un giocatore in campo", () => {
    const c = clone(PICK_AND_SHOOT);
    c.steps[0].screens = [{ from: "c1", to: { x: 20, y: 5 } }];
    expect(firstMessage("HALF", c)).toMatch(/Il blocco parte/);
  });
});

describe("DrillCreateSchema", () => {
  it("vuole titolo, tipo e campo, e pulisce i facoltativi", () => {
    const r = DrillCreateSchema.parse({
      title: "  Pick and roll ",
      kind: "ATTACK",
      court: "HALF",
      description: "",
    });
    expect(r).toMatchObject({
      title: "Pick and roll",
      description: null,
      durationMin: null,
      competitiveTeamId: null,
    });
    expect(DrillCreateSchema.safeParse({ title: "", kind: "ATTACK", court: "HALF" }).success).toBe(
      false
    );
    expect(DrillCreateSchema.safeParse({ title: "x", kind: "NOPE", court: "HALF" }).success).toBe(
      false
    );
  });
});

describe("TrainingDrillsSchema", () => {
  it("accetta una scaletta con note e scambi, rifiuta lo stesso schema due volte", () => {
    const ok = TrainingDrillsSchema.safeParse([
      { drillId: "d1", note: "10 minuti", assignments: { teamA: { a3: "reg1" } } },
      { drillId: "d2" },
    ]);
    expect(ok.success).toBe(true);
    expect(TrainingDrillsSchema.safeParse([{ drillId: "d1" }, { drillId: "d1" }]).success).toBe(
      false
    );
    expect(
      TrainingDrillsSchema.safeParse([{ drillId: "d1", assignments: { teamZ: {} } }]).success
    ).toBe(false);
  });
});
