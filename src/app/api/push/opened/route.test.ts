import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: { pushDailyStat: { upsert: vi.fn() } },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordPushSent, romeDay } from "@/lib/notifications/pushStats";

const upsert = (prisma as unknown as { pushDailyStat: { upsert: Mock } }).pushDailyStat.upsert;

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/push/opened", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/push/opened", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({});
  });

  it("aumenta di uno le aperture del tipo, senza dati della persona", async () => {
    const res = await POST(makePost({ type: "NEW_TRAINING" }));
    expect(res.status).toBe(204);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where.day_type.type).toBe("NEW_TRAINING");
    expect(arg.update).toEqual({ opened: { increment: 1 } });
    expect(arg.create).toEqual({ day: arg.where.day_type.day, type: "NEW_TRAINING", opened: 1 });
  });

  it("conta anche la notifica di prova", async () => {
    expect((await POST(makePost({ type: "TEST" }))).status).toBe(204);
  });

  it("rifiuta un tipo sconosciuto (400)", async () => {
    const res = await POST(makePost({ type: "QUALSIASI" }));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("ha un limite per indirizzo (429)", async () => {
    (checkRateLimit as Mock).mockReturnValueOnce({ allowed: false });
    expect((await POST(makePost({ type: "NEW_POST" }))).status).toBe(429);
  });
});

describe("recordPushSent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("una scrittura per lotto con il numero di invii riusciti", async () => {
    await recordPushSent("MATCH_CALLUP", 7, new Date("2026-11-11T23:30:00Z"));
    const arg = upsert.mock.calls[0][0];
    // 23:30 UTC è già il 12 a Roma.
    expect(arg.where.day_type).toEqual({
      day: new Date("2026-11-12T00:00:00Z"),
      type: "MATCH_CALLUP",
    });
    expect(arg.update).toEqual({ sent: { increment: 7 } });
  });

  it("non scrive senza invii o senza un tipo valido", async () => {
    await recordPushSent("MATCH_CALLUP", 0);
    await recordPushSent("", 3);
    await recordPushSent(undefined, 3);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("un errore del database non risale all'invio", async () => {
    upsert.mockRejectedValueOnce(new Error("db"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordPushSent("NEW_POST", 2)).resolves.toBeUndefined();
  });
});

describe("romeDay", () => {
  it("usa il giorno a Roma, anche con l'ora legale", () => {
    expect(romeDay(new Date("2026-07-01T22:30:00Z"))).toEqual(new Date("2026-07-02T00:00:00Z"));
    expect(romeDay(new Date("2026-07-01T21:30:00Z"))).toEqual(new Date("2026-07-01T00:00:00Z"));
  });
});
