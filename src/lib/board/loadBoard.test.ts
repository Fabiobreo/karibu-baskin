import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { PICK_AND_SHOOT } from "./fixtures";

vi.mock("@/lib/db", () => ({ prisma: { drill: { findUnique: vi.fn(), findMany: vi.fn() } } }));

import { prisma } from "@/lib/db";
import { boardViewer, loadBoardDrill } from "./loadBoard";

const findUnique = (prisma as unknown as { drill: { findUnique: Mock } }).drill.findUnique;

const row = (over: object = {}) => ({
  id: "d1",
  slug: "pick",
  title: "Pick",
  kind: "ATTACK",
  visibility: "MEMBERS",
  court: "HALF",
  description: null,
  durationMin: null,
  content: PICK_AND_SHOOT,
  competitiveTeam: null,
  status: "PUBLISHED",
  archivedAt: null,
  trainings: [
    { session: { id: "s1", dateSlug: "2026-11-20T18:00", title: "Allenamento", date: new Date() } },
  ],
  ...over,
});

describe("boardViewer", () => {
  it("distingue anonimo, ospite, tesserato e staff", () => {
    expect(boardViewer(undefined, false)).toBe("anonymous");
    expect(boardViewer("GUEST", true)).toBe("guest");
    expect(boardViewer("PARENT", true)).toBe("member");
    expect(boardViewer("DIRECTOR", true)).toBe("member");
    expect(boardViewer("COACH", true)).toBe("staff");
  });
});

describe("loadBoardDrill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("schema pubblicato: ai tesserati con gli allenamenti, agli altri no", async () => {
    findUnique.mockResolvedValue(row());
    const page = await loadBoardDrill("pick", "member");
    expect(page?.preview).toBe(false);
    expect(page?.drill.isPublic).toBe(false);
    expect(page?.trainings[0].href).toBe("/allenamento/2026-11-20T18:00");
    expect(await loadBoardDrill("pick", "anonymous")).toBeNull();
    expect(await loadBoardDrill("pick", "guest")).toBeNull();
  });

  it("esercizio reso pubblico: lo vede chiunque, senza gli allenamenti", async () => {
    findUnique.mockResolvedValue(row({ kind: "EXERCISE", visibility: "PUBLIC" }));
    const page = await loadBoardDrill("pick", "anonymous");
    expect(page?.drill.isPublic).toBe(true);
    expect(page?.trainings).toEqual([]);
  });

  it("uno schema segnato pubblico per errore resta dei tesserati", async () => {
    findUnique.mockResolvedValue(row({ kind: "ATTACK", visibility: "PUBLIC" }));
    expect(await loadBoardDrill("pick", "anonymous")).toBeNull();
  });

  it("bozza o archiviato: a nessuno, salvo lo staff in anteprima (mai indicizzabile)", async () => {
    for (const over of [{ status: "DRAFT" }, { archivedAt: new Date() }]) {
      findUnique.mockResolvedValue(row({ ...over, kind: "EXERCISE", visibility: "PUBLIC" }));
      expect(await loadBoardDrill("pick", "member")).toBeNull();
      expect(await loadBoardDrill("pick", "anonymous")).toBeNull();
      const staff = await loadBoardDrill("pick", "staff");
      expect(staff?.preview).toBe(true);
      expect(staff?.drill.isPublic).toBe(false);
    }
  });

  it("un disegno illeggibile non si mostra", async () => {
    findUnique.mockResolvedValue(row({ content: { v: 9 } }));
    expect(await loadBoardDrill("pick", "staff")).toBeNull();
  });
});
