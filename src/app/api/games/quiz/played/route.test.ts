import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    quizQuestion: { findMany: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("1.2.3.4"),
}));
vi.mock("@/lib/games/gameStats", () => ({
  recordGamePlay: vi.fn(),
  quizGameKey: (id: string) => `quiz:${id}`,
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { recordGamePlay } from "@/lib/games/gameStats";

const p = prisma as unknown as {
  quizQuestion: { findMany: Mock; updateMany: Mock };
  $transaction: Mock;
};
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/games/quiz/played", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

describe("POST /api/games/quiz/played", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.quizQuestion.findMany.mockResolvedValue([
      { id: "nato", correct: 1 },
      { id: "nome", correct: 2 },
    ]);
  });

  it("conta la partita e ricontrolla le risposte sul server", async () => {
    const res = await post({
      quizId: "baskin",
      answers: [
        { id: "nato", pick: 1 },
        { id: "nome", pick: 0 },
        { id: "inventata", pick: 0 },
      ],
    });
    expect(res.status).toBe(204);
    // Solo le domande approvate di quel quiz.
    expect(p.quizQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ quizId: "baskin", status: "APPROVED" }),
      })
    );
    expect(p.quizQuestion.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: { in: ["nato"] } },
      data: { shown: { increment: 1 }, correctCount: { increment: 1 } },
    });
    expect(p.quizQuestion.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ["nome"] } },
      data: { shown: { increment: 1 } },
    });
    expect(recordGamePlay).toHaveBeenCalledWith("quiz:baskin");
  });

  it("un quiz senza domande approvate non conta niente", async () => {
    p.quizQuestion.findMany.mockResolvedValue([]);
    expect((await post({ quizId: "x", answers: [{ id: "a", pick: 0 }] })).status).toBe(204);
    expect(recordGamePlay).not.toHaveBeenCalled();
  });

  it("rifiuta un corpo non valido", async () => {
    expect((await post({ answers: [] })).status).toBe(400);
  });
});
