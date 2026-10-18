import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { buildAvailabilityLookup } from "./availability";

const row = (
  userId: string | null,
  childId: string | null,
  available: boolean,
  setByStaff = false
) => ({ userId, childId, available, setByStaff });

describe("buildAvailabilityLookup", () => {
  it("senza riga la risposta manca (null), non è un no", () => {
    const lookup = buildAvailabilityLookup([], []);
    expect(lookup.forUser("u1")).toBeNull();
    expect(lookup.forChild("c1")).toBeNull();
    expect(lookup.forPerson({ userId: "u1" })).toBeNull();
  });

  it("legge la risposta di un account e di una scheda senza account", () => {
    const lookup = buildAvailabilityLookup(
      [row("u1", null, true), row(null, "c1", false, true)],
      []
    );
    expect(lookup.forUser("u1")).toEqual({ available: true, setByStaff: false });
    expect(lookup.forChild("c1")).toEqual({ available: false, setByStaff: true });
  });

  it("persona unica: la scheda collegata legge la risposta dell'account", () => {
    const lookup = buildAvailabilityLookup([row("u1", null, true)], [{ id: "c1", userId: "u1" }]);
    expect(lookup.forChild("c1")).toEqual({ available: true, setByStaff: false });
    expect(lookup.forPerson({ childId: "c1" })?.available).toBe(true);
  });

  it("persona unica: una vecchia riga sulla scheda vale per l'account solo come ripiego", () => {
    const onlyCard = buildAvailabilityLookup(
      [row(null, "c1", false)],
      [{ id: "c1", userId: "u1" }]
    );
    expect(onlyCard.forUser("u1")?.available).toBe(false);

    const both = buildAvailabilityLookup(
      [row(null, "c1", false), row("u1", null, true)],
      [{ id: "c1", userId: "u1" }]
    );
    expect(both.forUser("u1")?.available).toBe(true);
    expect(both.forChild("c1")?.available).toBe(true);
  });
});
