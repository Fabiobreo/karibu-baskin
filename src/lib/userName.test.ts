import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/slugUtils", () => ({ generateUserSlug: vi.fn() }));
vi.mock("@/lib/notifications/webpush", () => ({ sendPushToAll: vi.fn() }));

import { setOwnName, newUserPushBody } from "./userName";
import { prisma } from "@/lib/db";
import { generateUserSlug } from "@/lib/slugUtils";
import { sendPushToAll } from "@/lib/notifications/webpush";

const p = prisma as unknown as { user: { findUnique: Mock; update: Mock } };
const mockSlug = generateUserSlug as Mock;
const mockPush = sendPushToAll as Mock;

const magicLinkUser = { name: null, slug: null, appRole: "GUEST", accounts: [] };

describe("setOwnName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.user.findUnique.mockResolvedValue(magicLinkUser);
    p.user.update.mockResolvedValue({});
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
    expect(mockPush).toHaveBeenCalledOnce();
    expect(mockPush.mock.calls[0][0].body).toBe(newUserPushBody("Anna Bianchi"));
    expect(mockPush.mock.calls[0][1]).toBe(true); // solo admin
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

  it("403 se il nome arriva da Google", async () => {
    p.user.findUnique.mockResolvedValue({
      ...magicLinkUser,
      name: "Anna Bianchi",
      accounts: [{ id: "acc" }],
    });
    const res = await setOwnName("u1", "Altro Nome");
    expect(res).toMatchObject({ ok: false, status: 403 });
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("con Google ma senza nome, il nome si può mettere", async () => {
    p.user.findUnique.mockResolvedValue({ ...magicLinkUser, accounts: [{ id: "acc" }] });
    expect((await setOwnName("u1", "Anna Bianchi")).ok).toBe(true);
  });

  it("404 se l'utente non esiste", async () => {
    p.user.findUnique.mockResolvedValue(null);
    expect(await setOwnName("u1", "Anna Bianchi")).toMatchObject({ ok: false, status: 404 });
  });
});
