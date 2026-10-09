import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

const tx = {
  eventOptionSelection: { deleteMany: vi.fn(), createMany: vi.fn() },
  eventAttendance: { deleteMany: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  eventGuest: { deleteMany: vi.fn(), create: vi.fn(), update: vi.fn() },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    eventAttendance: { findMany: vi.fn() },
    eventOptionSelection: { findMany: vi.fn() },
    eventGuest: { findMany: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}));

import { saveFamilyRsvp, RsvpError, loadFamilyRsvp, loadFamilyAnswerStates } from "./eventRsvp";
import { prisma } from "@/lib/db";
import type { FamilyMember } from "./eventFamily";

const p = prisma as unknown as {
  eventAttendance: { findMany: Mock };
  eventOptionSelection: { findMany: Mock };
  eventGuest: { findMany: Mock };
};

const me: FamilyMember = { key: "u:me", userId: "me", childId: null, name: "Io", isSelf: true };
const dad: FamilyMember = {
  key: "u:dad",
  userId: "dad",
  childId: null,
  name: "Pierantonio",
  isSelf: false,
};
// Figlio con scheda e account: la riga canonica e' quella della scheda.
const son: FamilyMember = {
  key: "c:son",
  userId: "son-acc",
  childId: "son",
  name: "Fabio",
  isSelf: false,
};

const base = {
  eventId: "evt",
  selfId: "me",
  members: [me, dad, son],
  optionIds: ["lunch"],
  guests: [],
  allowGuests: false,
  maxGuests: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  p.eventAttendance.findMany.mockResolvedValue([]);
  p.eventOptionSelection.findMany.mockResolvedValue([]);
  p.eventGuest.findMany.mockResolvedValue([]);
  tx.eventGuest.create.mockImplementation(({ data }) => Promise.resolve({ id: "g-new", ...data }));
});

describe("loadFamilyAnswerStates()", () => {
  it("nessuno, qualcuno, tutti; la riga della scheda figlio vale per chi ha anche l'account", async () => {
    p.eventAttendance.findMany.mockResolvedValue([
      { eventId: "some", userId: "me", childId: null, status: "GOING" },
      { eventId: "all", userId: "me", childId: null, status: "NOT_GOING" },
      { eventId: "all", userId: "dad", childId: null, status: "GOING" },
      { eventId: "all", userId: null, childId: "son", status: "MAYBE" },
    ]);
    const states = await loadFamilyAnswerStates(["empty", "some", "all"], [me, dad, son]);
    expect(Object.fromEntries(states)).toEqual({
      empty: "none",
      some: "partial",
      all: "answered",
    });
  });

  it("senza eventi non interroga il database", async () => {
    expect((await loadFamilyAnswerStates([], [me])).size).toBe(0);
    expect(p.eventAttendance.findMany).not.toHaveBeenCalled();
  });
});

describe("saveFamilyRsvp()", () => {
  it("rifiuta chi non e' della famiglia", async () => {
    const people = [{ key: "u:stranger", status: "GOING" as const, optionIds: [] }];
    await expect(saveFamilyRsvp({ ...base, people })).rejects.toMatchObject({ status: 403 });
  });

  it("con un extra spuntato serve anche lo stato dell'evento", async () => {
    const people = [{ key: "u:dad", status: null, optionIds: ["lunch"] }];
    await expect(saveFamilyRsvp({ ...base, people })).rejects.toThrow(/Pierantonio/);
  });

  it("solo pranzo: Non ci sarò + Pranzo, risposto da chi salva", async () => {
    const people = [{ key: "u:dad", status: "NOT_GOING" as const, optionIds: ["lunch"] }];
    await saveFamilyRsvp({ ...base, people });
    expect(tx.eventAttendance.create).toHaveBeenCalledWith({
      data: {
        eventId: "evt",
        userId: "dad",
        status: "NOT_GOING",
        note: null,
        respondedById: "me",
      },
    });
    expect(tx.eventOptionSelection.createMany).toHaveBeenCalledWith({
      data: [{ optionId: "lunch", userId: "dad" }],
      skipDuplicates: true,
    });
  });

  it("per chi ha una scheda figlio scrive sulla scheda e toglie la vecchia riga sull'account", async () => {
    await saveFamilyRsvp({ ...base, people: [{ key: "c:son", status: "GOING", optionIds: [] }] });
    expect(tx.eventAttendance.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "evt", OR: [{ childId: "son" }, { userId: "son-acc", childId: null }] },
    });
    expect(tx.eventAttendance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ childId: "son", status: "GOING" }),
    });
  });

  it("non tocca le risposte che non cambiano (resta il 'risposto da' originale)", async () => {
    p.eventAttendance.findMany.mockResolvedValue([
      {
        userId: "dad",
        childId: null,
        status: "GOING",
        note: null,
        respondedById: "dad",
        respondedBy: { name: "Pierantonio" },
      },
    ]);
    await saveFamilyRsvp({ ...base, people: [{ key: "u:dad", status: "GOING", optionIds: [] }] });
    expect(tx.eventAttendance.deleteMany).not.toHaveBeenCalled();
    expect(tx.eventAttendance.create).not.toHaveBeenCalled();
  });

  it("esterni non ammessi dall'evento: rifiuta", async () => {
    const guests = [{ name: "Chiara", status: "GOING" as const, optionIds: [] }];
    await expect(saveFamilyRsvp({ ...base, people: [], guests })).rejects.toBeInstanceOf(RsvpError);
  });

  it("oltre il massimo di esterni: rifiuta", async () => {
    const guests = [
      { name: "Chiara", status: "GOING" as const, optionIds: [] },
      { name: null, status: "GOING" as const, optionIds: [] },
    ];
    await expect(
      saveFamilyRsvp({ ...base, people: [], guests, allowGuests: true, maxGuests: 1 })
    ).rejects.toThrow(/al massimo 1/);
  });

  it("crea l'esterno (nome facoltativo) con presenza ed extra", async () => {
    const guests = [{ name: "  ", status: "NOT_GOING" as const, optionIds: ["lunch"] }];
    await saveFamilyRsvp({ ...base, people: [], guests, allowGuests: true });
    expect(tx.eventGuest.create).toHaveBeenCalledWith({
      data: { eventId: "evt", name: null, addedById: "me" },
    });
    expect(tx.eventOptionSelection.createMany).toHaveBeenCalledWith({
      data: [{ optionId: "lunch", guestId: "g-new" }],
      skipDuplicates: true,
    });
  });

  it('un esterno non puo\' essere "Forse"', async () => {
    const guests = [{ name: "Chiara", status: "MAYBE" as const, optionIds: [] }];
    await expect(
      saveFamilyRsvp({ ...base, people: [], guests, allowGuests: true })
    ).rejects.toThrow(/Forse/);
  });

  it('un esterno "solo agli extra" deve avere almeno un extra', async () => {
    const guests = [{ name: "Chiara", status: "NOT_GOING" as const, optionIds: [] }];
    await expect(
      saveFamilyRsvp({ ...base, people: [], guests, allowGuests: true })
    ).rejects.toThrow(/Chiara/);
  });

  it("non si modifica l'esterno di un altro", async () => {
    const guests = [{ id: "g-altrui", name: "Nonna", status: "GOING" as const, optionIds: [] }];
    await expect(
      saveFamilyRsvp({ ...base, people: [], guests, allowGuests: true })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("toglie gli esterni non piu' inviati", async () => {
    p.eventGuest.findMany.mockResolvedValue([
      { id: "g-old", name: "Chiara", attendance: { status: "GOING", note: null }, selections: [] },
    ]);
    await saveFamilyRsvp({ ...base, people: [], guests: [], allowGuests: true });
    expect(tx.eventGuest.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["g-old"] } } });
  });
});

describe("loadFamilyRsvp()", () => {
  it("legge la vecchia riga sull'account se la scheda figlio non ha risposte", async () => {
    p.eventAttendance.findMany.mockResolvedValue([
      {
        userId: "son-acc",
        childId: null,
        status: "MAYBE",
        note: null,
        respondedById: "son-acc",
        respondedBy: { name: "Fabio" },
      },
    ]);
    const { members } = await loadFamilyRsvp("evt", "me", [me, son], []);
    expect(members.find((m) => m.key === "c:son")).toMatchObject({
      status: "MAYBE",
      respondedByName: null, // ha risposto lui stesso
    });
  });

  it("mostra chi ha risposto per un altro", async () => {
    p.eventAttendance.findMany.mockResolvedValue([
      {
        userId: "dad",
        childId: null,
        status: "GOING",
        note: null,
        respondedById: "mom",
        respondedBy: { name: "Giovanna" },
      },
    ]);
    const { members } = await loadFamilyRsvp("evt", "me", [me, dad], []);
    expect(members.find((m) => m.key === "u:dad")?.respondedByName).toBe("Giovanna");
  });
});
