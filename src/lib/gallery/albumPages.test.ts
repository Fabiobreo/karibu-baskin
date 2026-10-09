import { describe, it, expect } from "vitest";
import { albumPageCount, albumPageHref, albumPageOfIndex, parseAlbumPage } from "./albumPages";

describe("albumPageCount", () => {
  it("60 foto per pagina", () => {
    expect(albumPageCount(0)).toBe(1);
    expect(albumPageCount(8)).toBe(1);
    expect(albumPageCount(60)).toBe(1);
    expect(albumPageCount(61)).toBe(2);
    expect(albumPageCount(307)).toBe(6);
  });
});

describe("parseAlbumPage", () => {
  it("legge la pagina dall'URL", () => {
    expect(parseAlbumPage("4", 6)).toBe(4);
    expect(parseAlbumPage(["2", "5"], 6)).toBe(2);
  });

  it("senza parametro o con un valore non valido è la prima", () => {
    for (const raw of [undefined, "", "abc", "-2", "1.5", "0", "2x"]) {
      expect(parseAlbumPage(raw, 6)).toBe(1);
    }
  });

  it("oltre la fine è l'ultima", () => {
    expect(parseAlbumPage("7", 6)).toBe(6);
    expect(parseAlbumPage("99999", 6)).toBe(6);
  });
});

describe("albumPageOfIndex", () => {
  it("trova la pagina di una foto dalla sua posizione", () => {
    expect(albumPageOfIndex(0)).toBe(1);
    expect(albumPageOfIndex(59)).toBe(1);
    expect(albumPageOfIndex(60)).toBe(2);
    expect(albumPageOfIndex(306)).toBe(6);
  });
});

describe("albumPageHref", () => {
  it("la prima pagina non ha parametro", () => {
    expect(albumPageHref("torneo", 1)).toBe("/gallery/torneo");
    expect(albumPageHref("torneo", 4)).toBe("/gallery/torneo?pagina=4");
  });
});
