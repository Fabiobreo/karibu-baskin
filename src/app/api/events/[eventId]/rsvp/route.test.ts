import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    eventAttendance: { count: vi.fn().mockResolvedValue(3) },
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/eventFamily", () => ({ loadFamily: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/eventRsvp", async (orig) => {
  const actual = await orig<typeof import("@/lib/eventRsvp")>();
  return {
    ...actual,
    saveFamilyRsvp: vi.fn(),
    loadFamilyRsvp: vi.fn().mockResolvedValue({ members: [], guests: [] }),
  };
});

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { RsvpError, saveFamilyRsvp } from "@/lib/eventRsvp";

const p = prisma as unknown as { event: { findUnique: Mock } };
const mockAuth = auth as unknown as Mock;
const mockSave = saveFamilyRsvp as unknown as Mock;
const params = { params: Promise.resolve({ eventId: "evt-1" }) };
const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/events/evt-1/rsvp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params
  );
const body = { people: [{ key: "u:u1", status: "GOING", optionIds: [] }], guests: [] };

describe("PUT /api/events/[eventId]/rsvp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    p.event.findUnique.mockResolvedValue({
      id: "evt-1",
      date: new Date(Date.now() + 3 * 86_400_000),
      endDate: null,
      allowGuests: true,
      maxGuests: 2,
      options: [{ id: "o1" }],
    });
  });

  it("401 senza accesso", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await put(body)).status).toBe(401);
  });

  it("400 con una persona non valida", async () => {
    expect(
      (await put({ people: [{ key: "x", status: null, optionIds: [] }], guests: [] })).status
    ).toBe(400);
  });

  it("404 se l'evento non esiste", async () => {
    p.event.findUnique.mockResolvedValue(null);
    expect((await put(body)).status).toBe(404);
  });

  it("400 se l'evento e' concluso", async () => {
    p.event.findUnique.mockResolvedValue({
      id: "evt-1",
      date: new Date(Date.now() - 3 * 86_400_000),
      endDate: null,
      allowGuests: false,
      maxGuests: null,
      options: [],
    });
    expect((await put(body)).status).toBe(400);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("passa le regole dell'evento al salvataggio e restituisce lo stato", async () => {
    const res = await put(body);
    expect(res.status).toBe(200);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ selfId: "u1", optionIds: ["o1"], allowGuests: true, maxGuests: 2 })
    );
    expect(await res.json()).toEqual({ members: [], guests: [], going: 3 });
  });

  it("gli errori di regola diventano risposte JSON con il loro stato", async () => {
    mockSave.mockRejectedValue(new RsvpError("Puoi rispondere solo per la tua famiglia", 403));
    const res = await put(body);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Puoi rispondere solo per la tua famiglia" });
  });
});
