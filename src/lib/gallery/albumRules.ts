import type { AlbumVisibility, Prisma } from "@prisma/client";

/**
 * Regole degli album foto (UX-52), senza database: chi vede cosa e cosa cambia
 * a ogni aggiornamento dalla cartella Drive.
 */

/** Un album "Solo tesserati" lo vede chi è tesserato; uno pubblico chiunque. */
export function canSeeAlbum(visibility: AlbumVisibility, viewerIsMember: boolean): boolean {
  return visibility === "PUBLIC" || viewerIsMember;
}

/**
 * Album che esistono per il pubblico: cartella raggiungibile e almeno una foto
 * non nascosta. La visibilità è un filtro in più (`visibleAlbumWhere`).
 */
export const LISTED_ALBUM_WHERE = {
  unreachableAt: null,
  photoCount: { gt: 0 },
} satisfies Prisma.PhotoAlbumWhereInput;

/** Album che chi guarda può aprire. */
export function visibleAlbumWhere(viewerIsMember: boolean): Prisma.PhotoAlbumWhereInput {
  return viewerIsMember ? LISTED_ALBUM_WHERE : { ...LISTED_ALBUM_WHERE, visibility: "PUBLIC" };
}

export interface IndexedPhoto {
  id: string;
  driveFileId: string;
  position: number;
}

export interface IncomingPhoto {
  driveFileId: string;
}

export interface PhotoSyncPlan<T extends IncomingPhoto> {
  /** Foto nuove su Drive, con la posizione che avranno. */
  toCreate: Array<T & { position: number }>;
  /** Id (nostri) delle foto sparite da Drive. */
  toDeleteIds: string[];
  /** Foto rimaste che cambiano posto. */
  toMove: Array<{ id: string; position: number }>;
}

/**
 * Confronto fra l'indice salvato e la cartella com'è ora. Le foto rimaste non
 * si ricreano: tengono il loro id e quindi il loro "nascosta".
 */
export function planPhotoSync<T extends IncomingPhoto>(
  existing: IndexedPhoto[],
  incoming: T[]
): PhotoSyncPlan<T> {
  const byFileId = new Map(existing.map((p) => [p.driveFileId, p]));
  const seen = new Set<string>();
  const plan: PhotoSyncPlan<T> = { toCreate: [], toDeleteIds: [], toMove: [] };

  incoming.forEach((photo, position) => {
    // Lo stesso file due volte nell'elenco: vale il primo.
    if (seen.has(photo.driveFileId)) return;
    seen.add(photo.driveFileId);
    const current = byFileId.get(photo.driveFileId);
    if (!current) plan.toCreate.push({ ...photo, position });
    else if (current.position !== position) plan.toMove.push({ id: current.id, position });
  });

  for (const photo of existing) {
    if (!seen.has(photo.driveFileId)) plan.toDeleteIds.push(photo.id);
  }
  return plan;
}

/** La copertina: quella scelta se è ancora visibile, altrimenti la prima visibile. */
export function pickCover<P extends { id: string; hidden: boolean }>(
  photos: P[],
  coverPhotoId: string | null
): P | null {
  const visible = photos.filter((p) => !p.hidden);
  return visible.find((p) => p.id === coverPhotoId) ?? visible[0] ?? null;
}
