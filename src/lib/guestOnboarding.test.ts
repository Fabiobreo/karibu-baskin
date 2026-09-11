import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    registration: { count: vi.fn(), findFirst: vi.fn() },
    trainingSession: { findMany: vi.fn() },
  },
}));

import { computeOnboardingSteps, loadGuestOnboarding } from "./guestOnboarding";
import { prisma } from "@/lib/db";

const p = prisma as unknown as {
  user: { findUnique: Mock };
  registration: { count: Mock; findFirst: Mock };
  trainingSession: { findMany: Mock };
};

const noRole = {
  sportRole: null,
  sportRoleVariant: null,
  sportRoleSuggested: null,
  sportRoleSuggestedVariant: null,
};

describe("computeOnboardingSteps", () => {
  it("l'account è sempre fatto e la conferma sempre in attesa", () => {
    const steps = computeOnboardingSteps({ hasRole: false, hasRegistration: false });
    expect(steps.map((s) => [s.id, s.status])).toEqual([
      ["account", "done"],
      ["role", "todo"],
      ["training", "todo"],
      ["approval", "waiting"],
    ]);
  });

  it("spunta ruolo e allenamento quando ci sono", () => {
    const steps = computeOnboardingSteps({ hasRole: true, hasRegistration: true });
    expect(steps.filter((s) => s.status === "done").map((s) => s.id)).toEqual([
      "account",
      "role",
      "training",
    ]);
  });
});

describe("loadGuestOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.user.findUnique.mockResolvedValue(noRole);
    p.registration.count.mockResolvedValue(0);
    p.registration.findFirst.mockResolvedValue(null);
    p.trainingSession.findMany.mockResolvedValue([]);
  });

  it("usa il ruolo suggerito quando manca quello confermato", async () => {
    p.user.findUnique.mockResolvedValue({
      ...noRole,
      sportRoleSuggested: 2,
      sportRoleSuggestedVariant: "T",
    });
    const res = await loadGuestOnboarding("u1");
    expect(res.role).toEqual({ role: 2, variant: "T" });
    expect(res.doneCount).toBe(2);
  });

  it("propone solo allenamenti a cui il ruolo può iscriversi", async () => {
    const date = new Date("2026-09-18T18:30:00Z");
    p.user.findUnique.mockResolvedValue({ ...noRole, sportRoleSuggested: 3 });
    p.trainingSession.findMany.mockResolvedValue([
      { id: "s1", dateSlug: "a", date, allowedRoles: [4, 5] },
      { id: "s2", dateSlug: null, date, allowedRoles: [3] },
    ]);
    const res = await loadGuestOnboarding("u1");
    expect(res.nextSession?.href).toBe("/allenamento/s2");
  });

  it("senza ruolo propone solo allenamenti aperti a tutti", async () => {
    const date = new Date("2026-09-18T18:30:00Z");
    p.trainingSession.findMany.mockResolvedValue([
      { id: "s1", dateSlug: "a", date, allowedRoles: [3] },
    ]);
    expect((await loadGuestOnboarding("u1")).nextSession).toBeNull();
  });

  it("segna l'allenamento come fatto con una qualsiasi iscrizione", async () => {
    p.registration.count.mockResolvedValue(1);
    const res = await loadGuestOnboarding("u1");
    expect(res.steps.find((s) => s.id === "training")?.status).toBe("done");
  });
});
