import { describe, it, expect } from "vitest";
import {
  driveDownloadUrl,
  drivePhotoUrl,
  orientedSize,
  parseDriveFolderId,
  parseExifTime,
  sortPhotos,
  type DrivePhoto,
} from "./drive";

const ID = "1AbC_dEf-GhIjKlMnOpQrStUvWxYz01234";

describe("parseDriveFolderId", () => {
  it.each([
    [`https://drive.google.com/drive/folders/${ID}`],
    [`https://drive.google.com/drive/folders/${ID}?usp=sharing`],
    [`https://drive.google.com/drive/folders/${ID}?usp=drive_link&resourcekey=abc`],
    [`https://drive.google.com/drive/u/0/folders/${ID}`],
    [`https://drive.google.com/drive/u/2/folders/${ID}?usp=sharing`],
    [`https://drive.google.com/open?id=${ID}`],
    [`https://drive.google.com/open?id=${ID}&usp=sharing`],
    [`drive.google.com/drive/folders/${ID}`],
    [`  https://drive.google.com/drive/folders/${ID}  `],
    [ID],
  ])("legge l'id da %s", (link) => {
    expect(parseDriveFolderId(link)).toBe(ID);
  });

  it.each([
    [""],
    ["   "],
    ["ciao"],
    ["https://example.com/drive/folders/" + ID],
    ["https://drive.google.com.evil.test/drive/folders/" + ID],
    [`https://drive.google.com/file/d/${ID}/view`],
    ["https://drive.google.com/drive/my-drive"],
    ["https://photos.app.goo.gl/abcdefghijk"],
  ])("rifiuta %s", (link) => {
    expect(parseDriveFolderId(link)).toBeNull();
  });
});

describe("orientedSize", () => {
  it("lascia i lati come sono senza rotazione", () => {
    expect(orientedSize({ width: 4000, height: 3000 })).toEqual({ width: 4000, height: 3000 });
    expect(orientedSize({ width: 4000, height: 3000, rotation: 0 })).toEqual({
      width: 4000,
      height: 3000,
    });
  });

  it("scambia i lati con uno o tre quarti di giro", () => {
    expect(orientedSize({ width: 4000, height: 3000, rotation: 1 })).toEqual({
      width: 3000,
      height: 4000,
    });
    expect(orientedSize({ width: 4000, height: 3000, rotation: 3 })).toEqual({
      width: 3000,
      height: 4000,
    });
  });

  it("non li scambia con mezzo giro", () => {
    expect(orientedSize({ width: 4000, height: 3000, rotation: 2 })).toEqual({
      width: 4000,
      height: 3000,
    });
  });

  it("ripiega su 4:3 quando Drive non conosce le dimensioni", () => {
    expect(orientedSize(undefined)).toEqual({ width: 1600, height: 1200 });
    expect(orientedSize({ width: 0, height: 3000 })).toEqual({ width: 1600, height: 1200 });
  });
});

describe("parseExifTime", () => {
  it("legge il formato EXIF", () => {
    expect(parseExifTime("2026:05:17 15:42:08")?.toISOString()).toBe("2026-05-17T15:42:08.000Z");
  });

  it("restituisce null per valori mancanti o non validi", () => {
    expect(parseExifTime(undefined)).toBeNull();
    expect(parseExifTime("")).toBeNull();
    expect(parseExifTime("0000:00:00 00:00:00")).toBeNull();
    expect(parseExifTime("ieri")).toBeNull();
  });
});

describe("sortPhotos", () => {
  const photo = (name: string, takenAt: string | null): DrivePhoto => ({
    driveFileId: name,
    name,
    width: 4,
    height: 3,
    takenAt: takenAt ? new Date(takenAt) : null,
  });

  it("ordina per data di scatto, poi per nome, con le foto senza data in fondo", () => {
    const sorted = sortPhotos([
      photo("IMG_10.jpg", null),
      photo("b.jpg", "2026-05-17T10:00:00Z"),
      photo("IMG_2.jpg", null),
      photo("a.jpg", "2026-05-17T10:00:00Z"),
      photo("z.jpg", "2026-05-17T09:00:00Z"),
    ]);
    expect(sorted.map((p) => p.name)).toEqual([
      "z.jpg",
      "a.jpg",
      "b.jpg",
      "IMG_2.jpg",
      "IMG_10.jpg",
    ]);
  });
});

describe("drivePhotoUrl", () => {
  it("chiede a Google l'immagine alla larghezza voluta", () => {
    expect(drivePhotoUrl(ID, 400)).toBe(`https://lh3.googleusercontent.com/d/${ID}=w400`);
  });

  it("per il download chiede l'originale come allegato", () => {
    expect(driveDownloadUrl(ID)).toBe(`https://lh3.googleusercontent.com/d/${ID}=d`);
  });
});
