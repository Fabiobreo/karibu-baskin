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

  it("pubblicato: per tutti i tesserati, con gli allenamenti", async () => {
    findUnique.mockResolvedValue(row());
    const page = await loadBoardDrill("pick", false);
    expect(page?.preview).toBe(false);
    expect(page?.trainings[0].href).toBe("/allenamento/2026-11-20T18:00");
  });

  it("bozza o archiviato: 404 al tesserato, anteprima allo staff", async () => {
    for (const over of [{ status: "DRAFT" }, { archivedAt: new Date() }]) {
      findUnique.mockResolvedValue(row(over));
      expect(await loadBoardDrill("pick", false)).toBeNull();
      expect((await loadBoardDrill("pick", true))?.preview).toBe(true);
    }
  });

  it("un disegno illeggibile non si mostra", async () => {
    findUnique.mockResolvedValue(row({ content: { v: 9 } }));
    expect(await loadBoardDrill("pick", true)).toBeNull();
  });
});
