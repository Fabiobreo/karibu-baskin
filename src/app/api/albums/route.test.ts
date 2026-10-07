import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db", () => ({ prisma: {} }));

vi.mock("@/lib/apiAuth", () => ({
  staffGuard: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "coach-1", name: "Anna Coach" } }),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 9 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/gallery/albums", () => ({
  createAlbum: vi.fn().mockResolvedValue("album-1"),
  loadAlbumCard: vi.fn().mockResolvedValue({ id: "album-1", photoCount: 2 }),
}));

// La lettura di Drive è finta; il resto del modulo (id dal link, errori) è vero.
vi.mock("@/lib/gallery/drive", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gallery/drive")>()),
  listDriveFolder: vi.fn(),
}));

import { POST } from "./route";
import { staffGuard } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { createAlbum } from "@/lib/gallery/albums";
import { DriveError, listDriveFolder } from "@/lib/gallery/drive";
import { Prisma } from "@prisma/client";

const FOLDER_ID = "1AbC_dEf-GhIjKlMnOpQrStUvWxYz01234";
const listing = {
  folderId: FOLDER_ID,
  name: "Torneo",
  otherFiles: 0,
  truncated: false,
  photos: [
    { driveFileId: "f1", name: "1.jpg", width: 4, height: 3, takenAt: null },
    { driveFileId: "f2", name: "2.jpg", width: 4, height: 3, takenAt: null },
  ],
};

const valid = {
  link: `https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing`,
  title: "Torneo di primavera",
  date: "2026-05-17T10:00:00+02:00",
  permissionDeclared: true,
};

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/albums", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/albums", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (staffGuard as Mock).mockResolvedValue(null);
    (listDriveFolder as Mock).mockResolvedValue(listing);
    (createAlbum as Mock).mockResolvedValue("album-1");
  });

  it("rifiuta chi non è dello staff, senza toccare Drive", async () => {
    (staffGuard as Mock).mockResolvedValue(
      NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    );
    const res = await POST(post(valid));
    expect(res.status).toBe(403);
    expect(listDriveFolder).not.toHaveBeenCalled();
  });

  it("rifiuta l'album senza la dichiarazione del permesso", async () => {
    for (const permissionDeclared of [false, undefined]) {
      const res = await POST(post({ ...valid, permissionDeclared }));
      expect(res.status).toBe(400);
    }
    expect(listDriveFolder).not.toHaveBeenCalled();
    expect(createAlbum).not.toHaveBeenCalled();
  });

  it("rifiuta un link che non è una cartella Drive", async () => {
    const res = await POST(post({ ...valid, link: "https://example.com/foto" }));
    expect(res.status).toBe(400);
    expect(listDriveFolder).not.toHaveBeenCalled();
  });

  it("crea l'album 'Solo tesserati' e scrive nell'audit chi ha dichiarato il permesso", async () => {
    const res = await POST(post(valid));
    expect(res.status).toBe(201);
    expect(listDriveFolder).toHaveBeenCalledWith(FOLDER_ID);
    expect(createAlbum).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Torneo di primavera",
        visibility: "MEMBERS",
        declaredById: "coach-1",
        eventId: null,
        matchId: null,
      })
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "coach-1",
        action: "CREATE_ALBUM",
        targetId: "album-1",
        after: expect.objectContaining({
          visibility: "MEMBERS",
          permissionDeclaredBy: "Anna Coach",
        }),
      })
    );
  });

  it("risponde 422 se la cartella non è condivisa o non ha foto", async () => {
    (listDriveFolder as Mock).mockRejectedValueOnce(new DriveError("NOT_FOUND"));
    const notShared = await POST(post(valid));
    expect(notShared.status).toBe(422);
    expect((await notShared.json()).error).toContain("Chiunque abbia il link");

    (listDriveFolder as Mock).mockResolvedValueOnce({ ...listing, photos: [] });
    const empty = await POST(post(valid));
    expect(empty.status).toBe(422);
    expect(createAlbum).not.toHaveBeenCalled();
  });

  it("risponde 409 se la cartella è già un album", async () => {
    (createAlbum as Mock).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
    );
    const res = await POST(post(valid));
    expect(res.status).toBe(409);
  });
});
