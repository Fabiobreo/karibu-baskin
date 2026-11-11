import { describe, expect, it } from "vitest";
import { SITE_URL, SHORT_HOST } from "@/lib/siteUrl";
import { shareMessage, shareUrl, shareVisitFromSearch, shortAddress } from "@/lib/shareLinks";

describe("shareUrl", () => {
  it("aggiunge fonte, mezzo e campagna", () => {
    const url = new URL(shareUrl("/partite/karibu-thiene", "tabellino"));
    expect(url.origin + url.pathname).toBe(`${SITE_URL}/partite/karibu-thiene`);
    expect(url.searchParams.get("utm_source")).toBe("whatsapp");
    expect(url.searchParams.get("utm_medium")).toBe("share");
    expect(url.searchParams.get("utm_campaign")).toBe("tabellino");
  });

  it("usa la fonte richiesta", () => {
    const url = new URL(shareUrl("/eventi/festa", "evento", "qr"));
    expect(url.searchParams.get("utm_source")).toBe("qr");
  });
});

describe("shortAddress", () => {
  it("toglie protocollo, www, parametri e ancora", () => {
    expect(SHORT_HOST.startsWith("www.")).toBe(false);
    expect(shortAddress("/partite/x?utm_source=qr#top")).toBe(`${SHORT_HOST}/partite/x`);
    expect(shortAddress("news/y/")).toBe(`${SHORT_HOST}/news/y`);
  });
});

describe("shareMessage", () => {
  it("mette il link sulla riga sotto", () => {
    expect(shareMessage("Ciao", "https://x")).toBe("Ciao\nhttps://x");
  });
});

describe("shareVisitFromSearch", () => {
  it("riconosce i link dei bottoni del sito", () => {
    expect(
      shareVisitFromSearch("?utm_source=whatsapp&utm_medium=share&utm_campaign=convocati")
    ).toEqual({ campaign: "convocati", source: "whatsapp" });
  });

  it("ignora gli altri link", () => {
    expect(shareVisitFromSearch("")).toBeNull();
    expect(shareVisitFromSearch("?utm_source=instagram&utm_medium=bio")).toBeNull();
    // Link dello staff (docs/workflows/link-con-utm.md): nessuna campagna dell'elenco.
    expect(shareVisitFromSearch("?utm_source=whatsapp&utm_medium=share")).toBeNull();
    expect(
      shareVisitFromSearch("?utm_source=volantino&utm_medium=share&utm_campaign=news")
    ).toBeNull();
    expect(
      shareVisitFromSearch("?utm_source=whatsapp&utm_medium=share&utm_campaign=open-day")
    ).toBeNull();
  });
});
