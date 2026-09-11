import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/apiAuth", () => ({ isMember: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("@/lib/rating/simulatorServer", () => ({ runSimulation: vi.fn() }));

import { POST } from "./route";
import { isMember } from "@/lib/apiAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { runSimulation } from "@/lib/rating/simulatorServer";

const mockIsMember = isMember as Mock;
const mockRateLimit = checkRateLimit as Mock;
const mockRun = runSimulation as Mock;

const post = (body: unknown) =>
  new NextRequest("http://localhost/api/simulator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const valid = { a: ["user-1"], b: ["user-2"], nonce: 0 };
const result = { winProbabilityA: 0.62, label: "FavoritiA", scoreA: 51, scoreB: 44, winner: "A" };

describe("POST /api/simulator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ allowed: true });
    mockIsMember.mockResolvedValue(true);
    mockRun.mockResolvedValue({ ok: true, result });
  });

  it("è riservato ai tesserati", async () => {
    mockIsMember.mockResolvedValue(false);
    const res = await POST(post(valid));
    expect(res.status).toBe(403);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("applica il rate limit", async () => {
    mockRateLimit.mockReturnValue({ allowed: false });
    expect((await POST(post(valid))).status).toBe(429);
  });

  it("rifiuta un corpo non valido", async () => {
    expect((await POST(post({ a: [], b: ["user-2"], nonce: 0 }))).status).toBe(400);
    expect((await POST(post({ a: ["user-1"], b: ["user-2"], nonce: -1 }))).status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("rifiuta una formazione non valida secondo le regole Baskin", async () => {
    mockRun.mockResolvedValue({ ok: false, reason: "invalid-lineup" });
    const res = await POST(post(valid));
    expect(res.status).toBe(400);
  });

  it("restituisce solo il risultato aggregato", async () => {
    const res = await POST(post(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(mockRun).toHaveBeenCalledWith(["user-1"], ["user-2"], 0);
  });
});
