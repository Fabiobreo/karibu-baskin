import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Font per le immagini Open Graph (next/og).
 *
 * Satori non sintetizza il grassetto: se il peso non viene caricato esplicitamente
 * ripiega sul font di default (Noto Sans 400) e `fontWeight: 800` non ha alcun
 * effetto. Da qui i titoli "sottili" nelle anteprime dei link.
 *
 * I file stanno in `public/fonts/`, non su Google Fonts: le OG dinamiche
 * (giocatore, partita, squadra) non hanno `generateStaticParams`, quindi si
 * generano a ogni richiesta e scaricarli online costava ~950 KB per anteprima.
 * Sono subset latin + latin-ext di Inter (~81 KB l'uno), lo stesso font del sito.
 */

export type OgFontWeight = 400 | 700 | 800;

export interface OgFont {
  name: string;
  data: Buffer;
  weight: OgFontWeight;
  style: "normal";
}

/** Un'istanza serverless calda legge i file una volta sola. */
const cache = new Map<OgFontWeight, Promise<Buffer>>();

function read(weight: OgFontWeight): Promise<Buffer> {
  let pending = cache.get(weight);
  if (!pending) {
    pending = readFile(join(process.cwd(), "public", "fonts", `Inter-${weight}.ttf`));
    // Un errore di lettura non deve restare in cache: al prossimo render si riprova.
    pending.catch(() => cache.delete(weight));
    cache.set(weight, pending);
  }
  return pending;
}

/**
 * Carica i pesi richiesti di Inter. Se un file manca restituisce un array vuoto:
 * l'immagine viene comunque generata con il font di default, meglio di un'anteprima
 * che non si genera affatto.
 */
export async function loadInterFonts(weights: OgFontWeight[]): Promise<OgFont[]> {
  try {
    const data = await Promise.all(weights.map(read));
    return weights.map((weight, i) => ({
      name: "Inter",
      data: data[i],
      weight,
      style: "normal" as const,
    }));
  } catch (err) {
    console.error("[og] caricamento font fallito, uso il font di default", err);
    return [];
  }
}
