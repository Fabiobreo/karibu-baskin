import { describe, it, expect } from "vitest";
import {
  organizationJsonLd,
  newsArticleJsonLd,
  eventJsonLd,
  sportsEventJsonLd,
  serializeJsonLd,
  faqPageJsonLd,
} from "./structuredData";
import { getFaqs } from "@/lib/content/faqs";
import { CLUB_PHONES } from "@/lib/clubContacts";

describe("structuredData", () => {
  it("descrive l'associazione con i dati della pagina Contatti", () => {
    const org = organizationJsonLd();
    expect(org["@type"]).toEqual(["SportsOrganization", "SportsClub"]);
    expect(org.taxID).toBe("04301440246");
    expect(org.address).toMatchObject({
      streetAddress: "Via del Vigo, 11",
      postalCode: "36075",
      addressLocality: "Montecchio Maggiore",
      addressRegion: "VI",
      addressCountry: "IT",
    });
    expect(org.sameAs).toContain("https://www.instagram.com/karibubaskin");
    expect(org.areaServed.map((a) => a.name)).toContain("Montecchio Maggiore");
    // La scheda Google del club e il suo segnaposto.
    expect(org.sameAs).toContain("https://maps.google.com/?cid=10043041815261947815");
    expect(org.geo).toMatchObject({ "@type": "GeoCoordinates", latitude: 45.4989316 });
  });

  it("usa lo stesso telefono del footer, in formato internazionale", () => {
    const org = organizationJsonLd();
    expect(org.telephone).toBe("+393492972703");
    expect(CLUB_PHONES.map((p) => p.href)).toContain(`tel:${org.telephone}`);
  });

  it("elenca tutte le FAQ nella lingua della pagina", () => {
    for (const locale of ["it", "en"]) {
      const faqs = getFaqs(locale);
      const ld = faqPageJsonLd(faqs);
      const count = faqs.reduce((n, c) => n + c.items.length, 0);
      expect(ld["@type"]).toBe("FAQPage");
      expect(ld.mainEntity).toHaveLength(count);
      expect(ld.mainEntity[0]).toMatchObject({
        "@type": "Question",
        name: faqs[0].items[0].q,
        acceptedAnswer: { "@type": "Answer", text: faqs[0].items[0].a },
      });
    }
  });

  it("serializza JSON valido, senza </script> e senza markup Person", () => {
    for (const data of [organizationJsonLd(), faqPageJsonLd(getFaqs("it"))]) {
      const out = serializeJsonLd(data);
      expect(() => JSON.parse(out)).not.toThrow();
      expect(out).not.toContain("</script>");
      expect(out).not.toMatch(/"@type":"Person"/);
    }
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

    // Con il luogo da matchLocation(): in trasferta vale l'indirizzo dell'avversaria.
    const awayKnown = sportsEventJsonLd({
      ...base,
      isHome: false,
      location: { kind: "opponent", label: "Via Roma 1, Bassano" },
    });
    expect(awayKnown.location).toMatchObject({ name: "Via Roma 1, Bassano" });
    const unknown = sportsEventJsonLd({
      ...base,
      isHome: true,
      location: { kind: "unknown", label: null },
    });
    expect(unknown).not.toHaveProperty("location");
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
