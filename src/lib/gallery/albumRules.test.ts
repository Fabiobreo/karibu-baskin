import { describe, it, expect } from "vitest";
import { canSeeAlbum, pickCover, planPhotoSync, visibleAlbumWhere } from "./albumRules";

describe("canSeeAlbum", () => {
  it("un album per i tesserati non lo vede chi non è tesserato", () => {
    expect(canSeeAlbum("MEMBERS", false)).toBe(false);
    expect(canSeeAlbum("MEMBERS", true)).toBe(true);
  });

  it("un album pubblico lo vedono tutti", () => {
    expect(canSeeAlbum("PUBLIC", false)).toBe(true);
    expect(canSeeAlbum("PUBLIC", true)).toBe(true);
  });
});

describe("visibleAlbumWhere", () => {
  it("a chi non è tesserato lascia solo gli album pubblici", () => {
    expect(visibleAlbumWhere(false)).toMatchObject({ visibility: "PUBLIC" });
    expect(visibleAlbumWhere(true)).not.toHaveProperty("visibility");
  });

  it("esclude sempre gli album non raggiungibili o senza foto visibili", () => {
    for (const member of [true, false]) {
      expect(visibleAlbumWhere(member)).toMatchObject({
        unreachableAt: null,
        photoCount: { gt: 0 },
      });
    }
  });
});

describe("planPhotoSync", () => {
  const existing = [
    { id: "p1", driveFileId: "a", position: 0 },
    { id: "p2", driveFileId: "b", position: 1 },
    { id: "p3", driveFileId: "c", position: 2 },
  ];

  it("non tocca niente se la cartella non è cambiata", () => {
    const plan = planPhotoSync(existing, [
      { driveFileId: "a" },
      { driveFileId: "b" },
      { driveFileId: "c" },
    ]);
    expect(plan).toEqual({ toCreate: [], toDeleteIds: [], toMove: [] });
  });

  it("aggiunge le nuove, toglie le sparite e sposta le rimaste", () => {
    const plan = planPhotoSync(existing, [
      { driveFileId: "new1" },
      { driveFileId: "a" },
      { driveFileId: "c" },
      { driveFileId: "new2" },
    ]);
    expect(plan.toCreate).toEqual([
      { driveFileId: "new1", position: 0 },
      { driveFileId: "new2", position: 3 },
    ]);
    expect(plan.toDeleteIds).toEqual(["p2"]);
    // "a" passa da 0 a 1; "c" resta a 2 e non compare.
    expect(plan.toMove).toEqual([{ id: "p1", position: 1 }]);
  });

  it("le foto rimaste tengono il loro id (e quindi restano nascoste)", () => {
    const plan = planPhotoSync(existing, [{ driveFileId: "b" }]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.toDeleteIds).toEqual(["p1", "p3"]);
    expect(plan.toMove).toEqual([{ id: "p2", position: 0 }]);
  });

  it("ignora un file ripetuto nell'elenco", () => {
    const plan = planPhotoSync([], [{ driveFileId: "a" }, { driveFileId: "a" }]);
    expect(plan.toCreate).toHaveLength(1);
  });
});

describe("pickCover", () => {
  const photos = [
    { id: "p1", hidden: true },
    { id: "p2", hidden: false },
    { id: "p3", hidden: false },
  ];

  it("usa la copertina scelta se è visibile", () => {
    expect(pickCover(photos, "p3")?.id).toBe("p3");
  });

  it("ripiega sulla prima visibile se la scelta è nascosta o non c'è più", () => {
    expect(pickCover(photos, "p1")?.id).toBe("p2");
    expect(pickCover(photos, "sparita")?.id).toBe("p2");
    expect(pickCover(photos, null)?.id).toBe("p2");
  });

  it("null se non c'è nessuna foto visibile", () => {
    expect(pickCover([{ id: "p1", hidden: true }], null)).toBeNull();
  });
});
