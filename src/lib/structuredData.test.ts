import { describe, it, expect } from "vitest";
import {
  organizationJsonLd,
  newsArticleJsonLd,
  eventJsonLd,
  sportsEventJsonLd,
  serializeJsonLd,
} from "./structuredData";

describe("structuredData", () => {
  it("descrive l'associazione con i dati della pagina Contatti", () => {
    const org = organizationJsonLd();
    expect(org["@type"]).toBe("SportsOrganization");
    expect(org.taxID).toBe("04301440246");
    expect(org.address.addressLocality).toBe("Montecchio Maggiore");
    expect(org.sameAs).toContain("https://www.instagram.com/karibubaskin");
  });

  it("mette la nostra squadra in casa o in trasferta secondo isHome", () => {
    const base = {
      slug: "montekki-vs-orsi",
      date: new Date("2026-10-04T15:00:00Z"),
      ourTeam: "Montekki",
      opponent: "Orsi Bassano",
    };
    const home = sportsEventJsonLd({ ...base, isHome: true });
    expect(home.homeTeam.name).toBe("Montekki");
    expect(home.awayTeam.name).toBe("Orsi Bassano");
    expect(home.location).toMatchObject({ name: "Polisportivo Gino Cosaro" });

    const away = sportsEventJsonLd({ ...base, isHome: false });
    expect(away.homeTeam.name).toBe("Orsi Bassano");
    // In trasferta senza campo gara la sede non è nota: meglio nessuna che una sbagliata.
    expect(away).not.toHaveProperty("location");
  });

  it("non contiene nomi di giocatori", () => {
    const json = JSON.stringify(
      sportsEventJsonLd({
        slug: "x",
        date: new Date(),
        ourTeam: "Montekki",
        opponent: "Orsi",
        isHome: true,
      })
    );
    expect(json).not.toMatch(/"@type":"Person"/);
  });

  it("usa date ISO e riferisce l'associazione come editore", () => {
    const article = newsArticleJsonLd({
      title: "Derby di ritorno",
      description: "Com'è andata",
      slug: "derby-di-ritorno",
      publishedAt: new Date("2026-09-01T10:00:00Z"),
    });
    expect(article.datePublished).toBe("2026-09-01T10:00:00.000Z");
    expect(article.publisher["@id"]).toMatch(/#organization$/);

    const ev = eventJsonLd({ name: "Torneo", slug: "torneo", startDate: new Date("2026-11-01Z") });
    expect(ev).not.toHaveProperty("location");
    expect(ev).not.toHaveProperty("endDate");
  });

  it("neutralizza </script> nella serializzazione", () => {
    const out = serializeJsonLd({ headline: "Fine</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).headline).toBe("Fine</script><script>alert(1)</script>");
  });
});
