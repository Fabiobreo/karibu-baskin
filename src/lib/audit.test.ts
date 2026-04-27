import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    auditEvent: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { logAudit } from "./audit";
import { prisma } from "@/lib/db";

const mockCreate = (prisma.auditEvent as unknown as { create: Mock }).create;

describe("logAudit()", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it("chiama prisma.auditEvent.create con i dati corretti", async () => {
    await logAudit({
      actorId: "admin-1",
      action: "UPDATE_ROLE",
      targetType: "User",
      targetId: "user-42",
      before: { role: "ATHLETE" },
      after: { role: "COACH" },
    });
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        actorId: "admin-1",
        action: "UPDATE_ROLE",
        targetType: "User",
        targetId: "user-42",
        before: { role: "ATHLETE" },
        after: { role: "COACH" },
      },
    });
  });

  it("converte before/after null in undefined", async () => {
    await logAudit({
      actorId: "admin-1",
      action: "DELETE_USER",
      targetType: "User",
      targetId: "user-99",
      before: null,
      after: null,
    });
    const { data } = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.before).toBeUndefined();
    expect(data.after).toBeUndefined();
  });

  it("omette before/after quando non forniti", async () => {
    await logAudit({
      actorId: "admin-1",
      action: "LINK_ACCEPTED",
      targetType: "LinkRequest",
      targetId: "lr-1",
    });
    const { data } = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.before).toBeUndefined();
    expect(data.after).toBeUndefined();
  });

  it("supporta tutte le AuditAction senza errori di tipo", async () => {
    const actions = [
      "UPDATE_ROLE",
      "UPDATE_SPORT_ROLE",
      "DELETE_USER",
      "DELETE_CHILD",
      "ADD_MEMBER",
      "REMOVE_MEMBER",
      "UPDATE_MATCH",
      "LINK_ACCEPTED",
      "LINK_REJECTED",
    ] as const;
    for (const action of actions) {
      await logAudit({ actorId: "a", action, targetType: "T", targetId: "id" });
    }
    expect(mockCreate).toHaveBeenCalledTimes(actions.length);
  });

  it("propaga il rigetto della promise in caso di errore DB", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB write failed"));
    await expect(
      logAudit({ actorId: "a", action: "DELETE_USER", targetType: "User", targetId: "u1" }),
    ).rejects.toThrow("DB write failed");
  });
});
