import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => {
  const tx = {
    post: { update: vi.fn() },
    poll: { update: vi.fn(), delete: vi.fn(), create: vi.fn() },
    pollOption: { update: vi.fn(), deleteMany: vi.fn() },
  };
  return {
    prisma: {
      post: { findUnique: vi.fn() },
      tx,
      $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));
vi.mock("@/lib/notifications/announce", () => ({ announcePost: vi.fn() }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/sanitizeHtml", () => ({ sanitizePostHtml: (html: string) => html }));

import { PUT } from "./route";
import { prisma } from "@/lib/db";

interface Tx {
  post: { update: Mock };
  poll: { update: Mock; delete: Mock; create: Mock };
  pollOption: { update: Mock; deleteMany: Mock };
}
const p = prisma as unknown as { post: { findUnique: Mock }; tx: Tx; $transaction: Mock };
const params = { params: Promise.resolve({ id: "post-1" }) };

const makePut = (body: unknown) =>
  new NextRequest("http://localhost/api/posts/post-1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const pollBody = (
  options: { id?: string; text: string; order: number }[],
  multiSelect = false
) => ({
  question: "Ci sarai?",
  multiSelect,
  closesAt: null,
  options,
});

const yes = { id: "yes", text: "Sì", order: 0 };
const no = { id: "no", text: "No", order: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((fn: (t: Tx) => unknown) => fn(p.tx));
  p.tx.post.update.mockResolvedValue({ id: "post-1", slug: "s", title: "T" });
  p.post.findUnique.mockResolvedValue({
    id: "post-1",
    publishedAt: new Date("2026-11-01T10:00:00Z"),
    poll: {
      id: "poll-1",
      multiSelect: false,
      closesAt: null,
      options: [
        { ...yes, _count: { votes: 5 } },
        { ...no, _count: { votes: 0 } },
      ],
    },
  });
});

describe("PUT /api/posts/[id]: i voti restano", () => {
  it("cambiare testo e immagine non tocca le opzioni votate", async () => {
    const res = await PUT(
      makePut({
        title: "Titolo corretto",
        imageUrl: "https://example.com/a.jpg",
        poll: pollBody([{ ...yes, text: "Sì, ci sono" }, no]),
      }),
      params
    );
    expect(res.status).toBe(200);
    expect(p.tx.pollOption.deleteMany).not.toHaveBeenCalled();
    expect(p.tx.pollOption.update).toHaveBeenCalledWith({
      where: { id: "yes" },
      data: { text: "Sì, ci sono", order: 0 },
    });
  });

  it("togliere un'opzione senza voti non chiede conferma", async () => {
    const res = await PUT(makePut({ poll: pollBody([yes, { text: "Forse", order: 1 }]) }), params);
    expect(res.status).toBe(200);
    expect(p.tx.pollOption.deleteMany).toHaveBeenCalledWith({
      where: { pollId: "poll-1", id: { in: ["no"] } },
    });
  });

  it("togliere un'opzione votata chiede conferma e non scrive", async () => {
    const res = await PUT(makePut({ poll: pollBody([no, { text: "Forse", order: 1 }]) }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).lost).toEqual([{ label: "Sì", count: 5 }]);
    expect(p.$transaction).not.toHaveBeenCalled();
  });

  it("con la conferma la toglie", async () => {
    const res = await PUT(
      makePut({ confirmAnswerLoss: true, poll: pollBody([no, { text: "Forse", order: 1 }]) }),
      params
    );
    expect(res.status).toBe(200);
    expect(p.tx.pollOption.deleteMany).toHaveBeenCalled();
  });

  it("spegnere un sondaggio votato chiede conferma", async () => {
    const res = await PUT(makePut({ poll: null }), params);
    expect(res.status).toBe(409);
    expect(p.tx.poll.delete).not.toHaveBeenCalled();
  });

  it("la selezione multipla non cambia dopo il primo voto", async () => {
    const res = await PUT(makePut({ poll: pollBody([yes, no], true) }), params);
    expect(res.status).toBe(409);
    expect(p.$transaction).not.toHaveBeenCalled();
  });

  it("un salvataggio senza sondaggio (pubblica/bozza) non lo tocca", async () => {
    const res = await PUT(makePut({ unpublish: true }), params);
    expect(res.status).toBe(200);
    expect(p.tx.poll.update).not.toHaveBeenCalled();
    expect(p.tx.pollOption.deleteMany).not.toHaveBeenCalled();
  });
});
