import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    appNotification: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { createAppNotification } from "./appNotifications";
import { prisma } from "@/lib/db";

const mockCreate = (prisma.appNotification as unknown as { create: Mock }).create;

describe("createAppNotification()", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it("chiama prisma.appNotification.create con il payload completo", async () => {
    const payload = {
      type: "NEW_TRAINING" as const,
      title: "Nuovo allenamento",
      body: "Mercoledì alle 20:00",
      url: "/allenamento/abc123",
      targetUserId: "user-1",
    };
    await createAppNotification(payload);
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({ data: payload });
  });

  it("funziona senza campi opzionali (url, targetUserId)", async () => {
    const payload = {
      type: "TEAMS_READY" as const,
      title: "Squadre pronte",
      body: "Le squadre per l'allenamento di domani sono state generate.",
    };
    await createAppNotification(payload);
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({ data: payload });
  });

  it("propaga il rigetto della promise in caso di errore DB", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB error"));
    await expect(
      createAppNotification({ type: "MATCH_RESULT" as const, title: "t", body: "b" }),
    ).rejects.toThrow("DB error");
  });

  it("non restituisce nulla (void)", async () => {
    const result = await createAppNotification({
      type: "NEW_TRAINING" as const,
      title: "t",
      body: "b",
    });
    expect(result).toBeUndefined();
  });
});
