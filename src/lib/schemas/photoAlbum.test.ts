import { describe, it, expect } from "vitest";
import { AlbumCreateSchema, AlbumUpdateSchema } from "./photoAlbum";

describe("AlbumCreateSchema", () => {
  const valid = {
    link: "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp",
    title: "Torneo di primavera",
    date: "2026-05-17T10:00:00+02:00",
    permissionDeclared: true,
  };

  it("accetta un payload minimo e sceglie 'Solo tesserati'", () => {
    const result = AlbumCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.visibility).toBe("MEMBERS");
  });

  it("rifiuta l'album senza la dichiarazione del permesso", () => {
    for (const permissionDeclared of [false, undefined, "true"]) {
      const result = AlbumCreateSchema.safeParse({ ...valid, permissionDeclared });
      expect(result.success).toBe(false);
    }
  });

  it("rifiuta titolo vuoto e data senza fuso", () => {
    expect(AlbumCreateSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(AlbumCreateSchema.safeParse({ ...valid, date: "2026-05-17T10:00" }).success).toBe(false);
  });

  it("accetta un evento o una partita, non tutti e due", () => {
    expect(AlbumCreateSchema.safeParse({ ...valid, eventId: "e1" }).success).toBe(true);
    expect(AlbumCreateSchema.safeParse({ ...valid, matchId: "m1" }).success).toBe(true);
    expect(AlbumCreateSchema.safeParse({ ...valid, eventId: "e1", matchId: "m1" }).success).toBe(
      false
    );
  });

  it("rifiuta una visibilità sconosciuta", () => {
    expect(AlbumCreateSchema.safeParse({ ...valid, visibility: "STAFF" }).success).toBe(false);
  });
});

describe("AlbumUpdateSchema", () => {
  it("accetta modifiche parziali", () => {
    expect(AlbumUpdateSchema.safeParse({ visibility: "PUBLIC" }).success).toBe(true);
    expect(AlbumUpdateSchema.safeParse({ coverPhotoId: null }).success).toBe(true);
    expect(AlbumUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rifiuta evento e partita insieme", () => {
    expect(AlbumUpdateSchema.safeParse({ eventId: "e1", matchId: "m1" }).success).toBe(false);
  });
});
