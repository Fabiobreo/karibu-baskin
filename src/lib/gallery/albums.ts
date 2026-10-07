import { Prisma, type AlbumVisibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugUtils";
import { DriveError, listDriveFolder, type DriveFolderListing } from "./drive";
import { planPhotoSync } from "./albumRules";

/**
 * Album foto da cartelle Google Drive (UX-52): scritture e letture condivise
 * da API, pagina pubblica e pannello staff. Le regole pure stanno in
 * `albumRules.ts`, la lettura di Drive in `drive.ts`.
 */

export async function generateAlbumSlug(title: string): Promise<string> {
  const base = slugify(title) || "album";
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const found = await prisma.photoAlbum.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!found) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// ── Schede album (lista pubblica e lista staff) ───────────────────────────────

export interface AlbumCard {
  id: string;
  slug: string;
  title: string;
  date: string;
  visibility: AlbumVisibility;
  /** Foto visibili. */
  photoCount: number;
  /** Foto indicizzate, nascoste comprese. */
  totalPhotos: number;
  otherFiles: number;
  driveFolderId: string;
  syncedAt: string;
  unreachableAt: string | null;
  eventId: string | null;
  matchId: string | null;
  /** File Drive della copertina; null se non c'è nessuna foto visibile. */
  coverFileId: string | null;
}

export async function loadAlbumCards(where: Prisma.PhotoAlbumWhereInput): Promise<AlbumCard[]> {
  const albums = await prisma.photoAlbum.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      visibility: true,
      photoCount: true,
      otherFiles: true,
      driveFolderId: true,
      syncedAt: true,
      unreachableAt: true,
      eventId: true,
      matchId: true,
      coverPhotoId: true,
      _count: { select: { photos: true } },
      // La prima visibile: copertina quando lo staff non ne ha scelta una.
      photos: {
        where: { hidden: false },
        orderBy: { position: "asc" },
        take: 1,
        select: { driveFileId: true },
      },
    },
  });

  const chosenIds = albums.flatMap((a) => (a.coverPhotoId ? [a.coverPhotoId] : []));
  const chosen = chosenIds.length
    ? await prisma.albumPhoto.findMany({
        where: { id: { in: chosenIds }, hidden: false },
        select: { id: true, driveFileId: true },
      })
    : [];
  const chosenById = new Map(chosen.map((p) => [p.id, p.driveFileId]));

  return albums.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    date: a.date.toISOString(),
    visibility: a.visibility,
    photoCount: a.photoCount,
    totalPhotos: a._count.photos,
    otherFiles: a.otherFiles,
    driveFolderId: a.driveFolderId,
    syncedAt: a.syncedAt.toISOString(),
    unreachableAt: a.unreachableAt?.toISOString() ?? null,
    eventId: a.eventId,
    matchId: a.matchId,
    coverFileId:
      (a.coverPhotoId && chosenById.get(a.coverPhotoId)) || a.photos[0]?.driveFileId || null,
  }));
}

export async function loadAlbumCard(id: string): Promise<AlbumCard | null> {
  return (await loadAlbumCards({ id }))[0] ?? null;
}

// ── Scritture ─────────────────────────────────────────────────────────────────

/** La data proposta per un album: la foto più vecchia, altrimenti adesso. */
export function suggestedAlbumDate(listing: DriveFolderListing): Date {
  const times = listing.photos.flatMap((p) => (p.takenAt ? [p.takenAt.getTime()] : []));
  return times.length ? new Date(Math.min(...times)) : new Date();
}

interface CreateAlbumInput {
  listing: DriveFolderListing;
  title: string;
  date: Date;
  visibility: AlbumVisibility;
  eventId: string | null;
  matchId: string | null;
  declaredById: string;
}

export async function createAlbum(input: CreateAlbumInput): Promise<string> {
  const slug = await generateAlbumSlug(input.title);
  const album = await prisma.photoAlbum.create({
    data: {
      slug,
      title: input.title,
      date: input.date,
      driveFolderId: input.listing.folderId,
      visibility: input.visibility,
      eventId: input.eventId,
      matchId: input.matchId,
      permissionDeclaredById: input.declaredById,
      photoCount: input.listing.photos.length,
      otherFiles: input.listing.otherFiles,
      photos: {
        createMany: {
          data: input.listing.photos.map((photo, position) => ({ ...photo, position })),
        },
      },
    },
    select: { id: true },
  });
  return album.id;
}

/** Riallinea `photoCount` (foto non nascoste) dopo una modifica alle foto. */
export async function recountAlbum(albumId: string): Promise<number> {
  const photoCount = await prisma.albumPhoto.count({ where: { albumId, hidden: false } });
  await prisma.photoAlbum.update({ where: { id: albumId }, data: { photoCount } });
  return photoCount;
}

export type AlbumSyncResult =
  | { ok: true; added: number; removed: number; photoCount: number }
  | { ok: false; unreachable: true };

/**
 * "Aggiorna": rilegge la cartella, aggiunge le foto nuove e toglie quelle
 * sparite. Le foto rimaste non si toccano, quindi quelle nascoste restano
 * nascoste. Se la cartella non risponde più l'album viene segnato come non
 * raggiungibile e l'indice resta com'è: se la condivisione torna, torna tutto.
 *
 * Gli altri errori di Drive (chiave mancante, quota) salgono al chiamante:
 * non dicono niente sulla cartella.
 */
export async function syncAlbum(albumId: string): Promise<AlbumSyncResult | null> {
  const album = await prisma.photoAlbum.findUnique({
    where: { id: albumId },
    select: { id: true, driveFolderId: true, coverPhotoId: true },
  });
  if (!album) return null;

  let listing: DriveFolderListing;
  try {
    listing = await listDriveFolder(album.driveFolderId);
  } catch (err) {
    if (err instanceof DriveError && (err.code === "NOT_FOUND" || err.code === "NOT_A_FOLDER")) {
      await prisma.photoAlbum.update({
        where: { id: albumId },
        data: { unreachableAt: new Date() },
      });
      return { ok: false, unreachable: true };
    }
    throw err;
  }

  const existing = await prisma.albumPhoto.findMany({
    where: { albumId },
    select: { id: true, driveFileId: true, position: true },
  });
  const plan = planPhotoSync(existing, listing.photos);
  const coverGone = !!album.coverPhotoId && plan.toDeleteIds.includes(album.coverPhotoId);

  const photoCount = await prisma.$transaction(async (tx) => {
    if (plan.toDeleteIds.length) {
      await tx.albumPhoto.deleteMany({ where: { id: { in: plan.toDeleteIds } } });
    }
    if (plan.toMove.length) {
      // Un solo UPDATE per tutte le posizioni: con una foto aggiunta in testa
      // si spostano tutte le altre, e mille UPDATE in fila non reggerebbero.
      const ids = plan.toMove.map((m) => m.id);
      const positions = plan.toMove.map((m) => m.position);
      await tx.$executeRaw`
        UPDATE "AlbumPhoto" AS p
        SET "position" = m.position
        FROM (SELECT unnest(${ids}::text[]) AS id, unnest(${positions}::int[]) AS position) AS m
        WHERE p.id = m.id`;
    }
    if (plan.toCreate.length) {
      await tx.albumPhoto.createMany({
        data: plan.toCreate.map((photo) => ({ ...photo, albumId })),
      });
    }
    const photoCount = await tx.albumPhoto.count({ where: { albumId, hidden: false } });
    await tx.photoAlbum.update({
      where: { id: albumId },
      data: {
        photoCount,
        otherFiles: listing.otherFiles,
        syncedAt: new Date(),
        unreachableAt: null,
        ...(coverGone && { coverPhotoId: null }),
      },
    });
    return photoCount;
  });

  return {
    ok: true,
    added: plan.toCreate.length,
    removed: plan.toDeleteIds.length,
    photoCount,
  };
}

// ── Aggiornamento automatico (cron) ───────────────────────────────────────────

/** Un album si riguarda da solo finché è recente: le foto arrivano a rate. */
const AUTO_SYNC_DAYS = 30;
/** Dopo questo tempo il cron non inizia un altro album: il resto al giro dopo. */
const AUTO_SYNC_BUDGET_MS = 20_000;

export interface RecentAlbumsSyncResult {
  /** Album recenti trovati. */
  total: number;
  synced: number;
  added: number;
  removed: number;
  /** Cartelle che non rispondono più. */
  unreachable: number;
  /** Errori che non dicono niente sulla cartella (quota, rete, chiave). */
  failed: number;
  /** Non iniziati per mancanza di tempo: passano in testa al prossimo giro. */
  skipped: number;
}

interface RecentAlbumsSyncOptions {
  budgetMs?: number;
  now?: () => number;
  syncOne?: (albumId: string) => Promise<AlbumSyncResult | null>;
}

/**
 * Rilegge da Drive gli album degli ultimi 30 giorni (per data dell'album o di
 * creazione). Un album che fallisce non ferma gli altri. Parte da quelli
 * aggiornati meno di recente, così chi resta fuori dal tempo a disposizione è
 * il primo del giro successivo.
 */
export async function syncRecentAlbums({
  budgetMs = AUTO_SYNC_BUDGET_MS,
  now = Date.now,
  syncOne = syncAlbum,
}: RecentAlbumsSyncOptions = {}): Promise<RecentAlbumsSyncResult> {
  const startedAt = now();
  const since = new Date(startedAt - AUTO_SYNC_DAYS * 24 * 60 * 60 * 1000);
  const albums = await prisma.photoAlbum.findMany({
    where: { OR: [{ date: { gte: since } }, { createdAt: { gte: since } }] },
    orderBy: { syncedAt: "asc" },
    select: { id: true, title: true },
  });

  const result: RecentAlbumsSyncResult = {
    total: albums.length,
    synced: 0,
    added: 0,
    removed: 0,
    unreachable: 0,
    failed: 0,
    skipped: 0,
  };

  for (const album of albums) {
    if (now() - startedAt >= budgetMs) {
      result.skipped++;
      continue;
    }
    try {
      const outcome = await syncOne(album.id);
      if (!outcome) continue; // eliminato nel frattempo
      if (outcome.ok) {
        result.synced++;
        result.added += outcome.added;
        result.removed += outcome.removed;
      } else {
        result.unreachable++;
      }
    } catch (err) {
      result.failed++;
      console.error(`[gallery-sync] album "${album.title}" (${album.id}):`, err);
    }
  }
  return result;
}
