import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    quiz: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    quizBest: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/games/quizAdmin", () => ({ afterQuizWrite: vi.fn() }));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { afterQuizWrite } from "@/lib/games/quizAdmin";

const p = prisma as unknown as {
  quiz: { findUnique: Mock; findMany: Mock; update: Mock; delete: Mock };
  quizBest: { deleteMany: Mock };
  $transaction: Mock;
};
const mockAuth = auth as Mock;
const ctx = { params: Promise.resolve({ id: "baskin" }) };
const put = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/admin/quizzes/baskin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx
  );

const question = (status: "DRAFT" | "APPROVED") => ({
  status,
  textEn: null,
  answersEn: [],
  explanationEn: null,
});
const quizWith = (approved: number) => ({
  id: "baskin",
  title: "Quiz del Baskin",
  visibility: "OFF",
  questionCount: 5,
  questions: [...Array.from({ length: approved }, () => question("APPROVED")), question("DRAFT")],
});

describe("PUT /api/admin/quizzes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "a-1", appRole: "ADMIN" } });
    p.quiz.findUnique.mockResolvedValue(quizWith(8));
    p.quiz.update.mockResolvedValue({ id: "baskin" });
  });

  it("cambiare le domande per partita azzera le migliori partite", async () => {
    expect((await put({ questionCount: 8 })).status).toBe(200);
    expect(p.quiz.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ questionCount: 8 }) })
    );
    expect(p.quizBest.deleteMany).toHaveBeenCalledWith({ where: { quizId: "baskin" } });
  });

  it("lo stesso numero non tocca le migliori partite", async () => {
    expect((await put({ questionCount: 5, title: "Quiz" })).status).toBe(200);
    expect(p.quizBest.deleteMany).not.toHaveBeenCalled();
  });

  it("su un quiz acceso non si alza il numero senza abbastanza approvate", async () => {
    // 8 approvate bastano per 5 domande a partita, non per 8 (ne servono 11).
    p.quiz.findUnique.mockResolvedValue({ ...quizWith(8), visibility: "MEMBERS" });
    const res = await put({ questionCount: 8 });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Servono ancora 3 domande approvate");
    expect(p.quiz.update).not.toHaveBeenCalled();
    // Spento, invece, si può preparare.
    p.quiz.findUnique.mockResolvedValue(quizWith(8));
    expect((await put({ questionCount: 8 })).status).toBe(200);
  });

  it("rifiuta meno di 3 o più di 10 domande per partita", async () => {
    expect((await put({ questionCount: 2 })).status).toBe(400);
    expect((await put({ questionCount: 11 })).status).toBe(400);
  });

  it("è solo dell'admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c-1", appRole: "COACH" } });
    expect((await put({ visibility: "MEMBERS" })).status).toBe(403);
    mockAuth.mockResolvedValue(null);
    expect((await put({ visibility: "MEMBERS" })).status).toBe(401);
    expect(p.quiz.update).not.toHaveBeenCalled();
  });

  it("non si accende sotto le 8 domande approvate", async () => {
    p.quiz.findUnique.mockResolvedValue(quizWith(7));
    const res = await put({ visibility: "PUBLIC" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Serve ancora 1 domanda approvata");
    expect(p.quiz.update).not.toHaveBeenCalled();
  });

  it("si accende con 8 approvate e lo segna nel registro", async () => {
    expect((await put({ visibility: "PUBLIC" })).status).toBe(200);
    expect(p.quiz.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { visibility: "PUBLIC" } })
    );
    expect(afterQuizWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE_QUIZ",
        before: { visibility: "OFF", questionCount: 5 },
      })
    );
  });

  it("si spegne sempre, anche senza domande", async () => {
    p.quiz.findUnique.mockResolvedValue({ ...quizWith(0), visibility: "MEMBERS" });
    expect((await put({ visibility: "OFF" })).status).toBe(200);
  });

  it("sposta il quiz rinumerando l'elenco", async () => {
    p.quiz.findMany.mockResolvedValue([{ id: "a" }, { id: "baskin" }, { id: "c" }]);
    expect((await put({ move: "up" })).status).toBe(200);
    const updates = p.$transaction.mock.calls[0][0];
    expect(updates).toHaveLength(3);
    expect(p.quiz.update.mock.calls.map((c) => [c[0].where.id, c[0].data.position])).toEqual([
      ["baskin", 0],
      ["a", 1],
      ["c", 2],
    ]);
  });

  it("404 su un quiz che non c'è", async () => {
    p.quiz.findUnique.mockResolvedValue(null);
    expect((await put({ title: "X" })).status).toBe(404);
  });
});

describe("DELETE /api/admin/quizzes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "a-1", appRole: "ADMIN" } });
  });

  it("elimina e lo segna nel registro", async () => {
    p.quiz.findUnique.mockResolvedValue({
      id: "baskin",
      title: "Quiz del Baskin",
      _count: { questions: 40 },
    });
    const res = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(204);
    expect(p.quiz.delete).toHaveBeenCalledWith({ where: { id: "baskin" } });
    expect(afterQuizWrite).toHaveBeenCalledWith(expect.objectContaining({ action: "DELETE_QUIZ" }));
  });
});
