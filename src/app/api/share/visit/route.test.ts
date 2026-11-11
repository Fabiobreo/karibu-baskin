import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: { shareVisitStat: { upsert: vi.fn() } },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

const upsert = (prisma as unknown as { shareVisitStat: { upsert: Mock } }).shareVisitStat.upsert;

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/share/visit", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/share/visit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({});
  });

  it("aumenta di uno le visite di campagna e fonte, senza dati della persona", async () => {
    const res = await POST(makePost({ campaign: "tabellino", source: "whatsapp" }));
    expect(res.status).toBe(204);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where.day_campaign_source).toMatchObject({
      campaign: "tabellino",
      source: "whatsapp",
    });
    expect(arg.update).toEqual({ visits: { increment: 1 } });
    expect(Object.keys(arg.create).sort()).toEqual(["campaign", "day", "source", "visits"]);
  });

  it("rifiuta valori fuori elenco", async () => {
    const res = await POST(makePost({ campaign: "spam", source: "whatsapp" }));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rispetta il rate limit", async () => {
    (checkRateLimit as Mock).mockReturnValueOnce({ allowed: false });
    const res = await POST(makePost({ campaign: "news", source: "link" }));
    expect(res.status).toBe(429);
  });
});
