import { SITE_URL } from "@/lib/siteUrl";

/**
 * Dati strutturati schema.org (JSON-LD) per le pagine pubbliche (KB-12).
 *
 * Il sito è fatto di eventi, partite, news e un'associazione con una sede: è
 * esattamente il contenuto che i dati strutturati servono a far capire ai
 * motori di ricerca. I dati dell'associazione sono gli stessi pubblicati nella
 * pagina Contatti.
 *
 * Privacy: nessun nome di giocatore finisce qui dentro. Le partite descrivono
 * squadre, non persone, e i profili giocatore non hanno markup `Person` (vedi
 * la tutela dei minori in @/lib/minors).
 */

const CONTEXT = "https://schema.org";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const HOME_VENUE = {
  "@type": "Place",
  name: "Polisportivo Gino Cosaro",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Via del Vigo, 11",
    postalCode: "36075",
    addressLocality: "Montecchio Maggiore",
    addressRegion: "VI",
    addressCountry: "IT",
  },
} as const;

/** Riferimento compatto all'associazione, per `organizer` e `publisher`. */
const organizationRef = { "@id": ORGANIZATION_ID };

export function organizationJsonLd() {
  return {
    "@context": CONTEXT,
    "@type": "SportsOrganization",
    "@id": ORGANIZATION_ID,
    name: "ASD Karibu Baskin Montecchio Maggiore",
    alternateName: "Karibu Baskin",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sport: "Baskin",
    foundingDate: "2015",
    email: "asdkaribubaskin@gmail.com",
    taxID: "04301440246",
    location: HOME_VENUE,
    address: HOME_VENUE.address,
    sameAs: [
      "https://www.instagram.com/karibubaskin",
      "https://www.facebook.com/karibubaskin",
      "https://youtube.com/@karibubaskin",
    ],
  };
}

export interface NewsArticleInput {
  title: string;
  description: string;
  slug: string;
  publishedAt: Date;
  imageUrl?: string | null;
  authorName?: string | null;
}

export function newsArticleJsonLd(a: NewsArticleInput) {
  const url = `${SITE_URL}/news/${a.slug}`;
  return {
    "@context": CONTEXT,
    "@type": "NewsArticle",
    headline: a.title,
    description: a.description,
    url,
    mainEntityOfPage: url,
    datePublished: a.publishedAt.toISOString(),
    ...(a.imageUrl ? { image: [a.imageUrl] } : {}),
    // L'autore è un membro dello staff che pubblica per conto dell'associazione.
    author: a.authorName
      ? { "@type": "Person", name: a.authorName }
      : { ...organizationRef, "@type": "Organization" },
    publisher: organizationRef,
  };
}

export interface EventInput {
  name: string;
  slug: string;
  startDate: Date;
  endDate?: Date | null;
  location?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

export function eventJsonLd(e: EventInput) {
  return {
    "@context": CONTEXT,
    "@type": "Event",
    name: e.name,
    url: `${SITE_URL}/eventi/${e.slug}`,
    startDate: e.startDate.toISOString(),
    ...(e.endDate ? { endDate: e.endDate.toISOString() } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    ...(e.location
      ? { location: { "@type": "Place", name: e.location, address: e.location } }
      : {}),
    ...(e.description ? { description: e.description } : {}),
    ...(e.imageUrl ? { image: [e.imageUrl] } : {}),
    organizer: organizationRef,
  };
}

export interface MatchInput {
  slug: string;
  date: Date;
  ourTeam: string;
  opponent: string;
  isHome: boolean;
  venue?: string | null;
}

export function sportsEventJsonLd(m: MatchInput) {
  const us = { "@type": "SportsTeam", name: m.ourTeam, sport: "Baskin" };
  const them = { "@type": "SportsTeam", name: m.opponent, sport: "Baskin" };
  const [home, away] = m.isHome ? [us, them] : [them, us];
  // Senza un campo gara, la sede nota è solo quella di casa.
  const location = m.venue
    ? { "@type": "Place", name: m.venue, address: m.venue }
    : m.isHome
      ? HOME_VENUE
      : undefined;
  return {
    "@context": CONTEXT,
    "@type": "SportsEvent",
    name: `${home.name} - ${away.name}`,
    url: `${SITE_URL}/partite/${m.slug}`,
    sport: "Baskin",
    startDate: m.date.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    homeTeam: home,
    awayTeam: away,
    ...(location ? { location } : {}),
    organizer: organizationRef,
  };
}

/**
 * Serializzazione sicura dentro `<script>`: `<` diventa `<`, così un
 * titolo che contiene `</script>` non può chiudere il tag e iniettare markup.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
