import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Costruzione centralizzata dei metadata di pagina.
 *
 * Serve perché Next **non** propaga `title`/`description` dentro `openGraph` e
 * `twitter`: una pagina che dichiara solo il titolo eredita quelli del root
 * layout, e il link condiviso mostra il titolo della home invece del proprio.
 * Stesso discorso per `og:url`, che se fisso nel layout fa collassare sulla home
 * l'identità di tutte le pagine condivise (Facebook e LinkedIn lo usano come
 * URL canonico dell'oggetto).
 *
 * Gli URL sono assoluti e costruiti su `SITE_URL`: il canonical deve puntare al
 * dominio di produzione anche quando la pagina è servita da un deploy di preview.
 *
 * Sulle immagini serve attenzione: dichiarare `openGraph` in un segmento figlio
 * fa perdere la `opengraph-image.tsx` ereditata dal segmento padre, e viceversa
 * un `images` esplicito qui **scavalca** quella del segmento (verificato sul
 * markup generato). Per questo l'immagine si sceglie per pagina con `image`.
 */

export const SITE_NAME = "Karibu Baskin";

/** Titolo usato quando la pagina non ne specifica uno proprio (la home). */
export const DEFAULT_TITLE = `${SITE_NAME} | Montecchio Maggiore`;

export interface BuildMetadataOptions {
  /** Titolo della pagina **senza** il suffisso del sito, che viene aggiunto qui. */
  title?: string;
  /** Descrizione per `<meta description>`, `og:description` e `twitter:description`. */
  description: string;
  /** Path assoluto della pagina, es. `/news/derby-di-ritorno`. Usato per canonical e og:url. */
  path: string;
  /** `article` per news ed eventi, `profile` per i giocatori, `website` altrove. */
  type?: "website" | "article" | "profile";
  /** Esclude la pagina dagli indici (aree private, profili di minorenni). */
  noindex?: boolean;
  /** Solo per `type: "article"`: data di pubblicazione ISO. */
  publishedTime?: string;
  /**
   * Immagine dell'anteprima:
   * - omessa → la card generica del sito (`/opengraph-image`);
   * - una URL → quell'immagine (es. la copertina di una news o di un evento);
   * - `"own"` → il segmento ha la propria `opengraph-image.tsx` e non va scavalcata.
   */
  image?: string | "own";
}

/** Card generica del sito, con le dimensioni che i social si aspettano. */
const DEFAULT_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "Karibu Baskin, sport inclusivo a Montecchio Maggiore (VI)",
};

/** Normalizza il path in modo che canonical e og:url non differiscano per uno slash. */
function canonicalUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  // La root resta senza slash finale, le altre lo perdono se presente.
  const clean = path === "/" ? "" : path.replace(/\/+$/, "");
  return `${SITE_URL}${clean}`;
}

export function buildMetadata({
  title,
  description,
  path,
  type = "website",
  noindex = false,
  publishedTime,
  image,
}: BuildMetadataOptions): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const url = canonicalUrl(path);
  const images = image === "own" ? undefined : [image ? { url: image } : DEFAULT_IMAGE];

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "it_IT",
      type,
      ...(images ? { images } : {}),
      ...(publishedTime && type === "article" ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
