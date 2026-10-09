import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/lib/slugUtils", () => ({ generateUserSlug: vi.fn() }));
vi.mock("@/lib/notifications/webpush", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createTargetedAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { setOwnName, newUserPushBody } from "./userName";
import { prisma } from "@/lib/db";
import { generateUserSlug } from "@/lib/slugUtils";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";

const p = prisma as unknown as { user: { findUnique: Mock; update: Mock; findMany: Mock } };
const mockSlug = generateUserSlug as Mock;
const mockPush = sendPushToUsers as Mock;
const mockInApp = createTargetedAppNotifications as Mock;

const magicLinkUser = { name: null, slug: null, appRole: "GUEST" };

describe("setOwnName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.user.findUnique.mockResolvedValue(magicLinkUser);
    p.user.update.mockResolvedValue({});
    p.user.findMany.mockResolvedValue([{ id: "coach" }, { id: "admin" }]);
    mockSlug.mockResolvedValue("anna-bianchi");
    mockPush.mockResolvedValue(undefined);
  });

  it("primo nome: salva nome e slug e avvisa lo staff col nome", async () => {
    const res = await setOwnName("u1", "Anna Bianchi");
    expect(res).toEqual({ ok: true, name: "Anna Bianchi" });
    expect(p.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Anna Bianchi", slug: "anna-bianchi" },
    });
    // Allenatori e admin, push e in-app: un allenatore può approvare un ospite.
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledOnce());
    expect(mockPush.mock.calls[0][0]).toEqual(["coach", "admin"]);
    expect(mockPush.mock.calls[0][1].body).toBe(newUserPushBody("Anna Bianchi"));
    expect(mockInApp.mock.calls[0][0]).toEqual(["coach", "admin"]);
  });

  it("correzione del nome: lo slug resta e lo staff non viene riavvisato", async () => {
    p.user.findUnique.mockResolvedValue({ ...magicLinkUser, name: "Ana", slug: "ana" });
    await setOwnName("u1", "Anna Bianchi");
    expect(p.user.update.mock.calls[0][0].data).toEqual({ name: "Anna Bianchi" });
    expect(mockSlug).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("un tesserato che mette il nome non genera la notifica 'nuovo utente'", async () => {
    p.user.findUnique.mockResolvedValue({ ...magicLinkUser, appRole: "ATHLETE" });
    await setOwnName("u1", "Anna Bianchi");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("404 se l'utente non esiste", async () => {
    p.user.findUnique.mockResolvedValue(null);
    expect(await setOwnName("u1", "Anna Bianchi")).toMatchObject({ ok: false, status: 404 });
  });
});
