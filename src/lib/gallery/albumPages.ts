/**
 * Pagine di un album foto (UX-52). Un album lungo si sfoglia a pagine, con il
 * numero nell'URL (`/gallery/<slug>?pagina=4`): il numero è un punto a cui
 * tornare e che si può mandare a qualcuno, e la pagina resta corta abbastanza
 * da arrivare al footer.
 */
export const ALBUM_PAGE_SIZE = 60;

/** Quante pagine servono (almeno una, anche per un album vuoto). */
export function albumPageCount(total: number, pageSize = ALBUM_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Pagina chiesta dall'URL, riportata dentro l'album: un valore mancante o non
 * valido è la prima, uno oltre la fine è l'ultima (un album a cui sono state
 * tolte foto non deve rispondere 404 a un vecchio link).
 */
export function parseAlbumPage(raw: string | string[] | undefined, pages: number): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{1,5}$/.test(value)) return 1;
  return Math.min(Math.max(Number(value), 1), pages);
}

/** La pagina che contiene la foto in posizione `index` (da 0). */
export function albumPageOfIndex(index: number, pageSize = ALBUM_PAGE_SIZE): number {
  return Math.floor(Math.max(index, 0) / pageSize) + 1;
}

/** La prima pagina non ha parametro: un solo indirizzo per l'album. */
export function albumPageHref(slug: string, page: number): string {
  return page <= 1 ? `/gallery/${slug}` : `/gallery/${slug}?pagina=${page}`;
}
