import { prisma } from "@/lib/db";
import { uploadImage, deleteImage } from "@/lib/blob";

// Versione Graph API (v21 chiude il 21/01/2027). Aggiornare quando Meta depreca quella in uso.
const GRAPH_VERSION = "v26.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Quanti post recuperare ad ogni sync (default 24).
const SYNC_LIMIT = Number(process.env.GALLERY_SYNC_LIMIT ?? 24);
// Quanti post mantenere in totale: oltre questo numero i più vecchi (e le loro
// immagini su Blob) vengono eliminati per non far crescere lo storage.
const MAX_POSTS = Number(process.env.GALLERY_MAX_POSTS ?? 60);

export interface InstagramSyncResult {
  ok: boolean;
  /** Motivo se ok=false (es. credenziali mancanti). */
  reason?: string;
  fetched: number;
  created: number;
  updated: number;
  pruned: number;
  /** Post nuovi rimasti da copiare perché è finito il tempo: li prende il giro successivo. */
  remaining: number;
}

export interface InstagramSyncOptions {
  /**
   * Tempo massimo (ms) dopo cui non si inizia a copiare un altro post. Il primo
   * sync copia decine di immagini e sforerebbe il limite della funzione: si ferma
   * prima, salva quello che ha fatto, e il giro dopo riparte dai post mancanti.
   */
  budgetMs?: number;
}

const DEFAULT_BUDGET_MS = 40_000;

type IgMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

interface IgChild {
  id: string;
  media_type: IgMediaType;
  media_url?: string;
  thumbnail_url?: string;
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type: IgMediaType;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  children?: { data: IgChild[] };
}

/** True se le credenziali Instagram sono configurate. */
export function isInstagramConfigured(): boolean {
  return !!process.env.IG_ACCESS_TOKEN && !!process.env.IG_BUSINESS_ACCOUNT_ID;
}

/** Scarica un'immagine remota e la ritorna come Buffer (o null se fallisce). */
async function downloadToBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[instagram] download fallito:", url, err);
    return null;
  }
}

/** Mirror su Vercel Blob delle immagini di un media IG. Ritorna gli URL Blob. */
async function mirrorMediaImages(media: IgMedia): Promise<string[]> {
  // Determina le sorgenti immagine da scaricare in ordine.
  const sources: string[] = [];

  if (media.media_type === "CAROUSEL_ALBUM" && media.children?.data) {
    for (const child of media.children.data) {
      const src = child.media_type === "VIDEO" ? child.thumbnail_url : child.media_url;
      if (src) sources.push(src);
    }
  } else if (media.media_type === "VIDEO") {
    if (media.thumbnail_url) sources.push(media.thumbnail_url);
  } else {
    if (media.media_url) sources.push(media.media_url);
  }

  // Le immagini di un carosello in parallelo, mantenendo l'ordine.
  const results = await Promise.all(
    sources.map(async (src) => {
      const buffer = await downloadToBuffer(src);
      if (!buffer) return null;
      try {
        const { url } = await uploadImage(buffer, { folder: "gallery" });
        return url;
      } catch (err) {
        console.error("[instagram] upload Blob fallito:", err);
        return null;
      }
    })
  );
  return results.filter((u): u is string => u !== null);
}

/** Recupera gli ultimi media dall'account Instagram Business via Graph API. */
async function fetchInstagramMedia(): Promise<IgMedia[]> {
  const token = process.env.IG_ACCESS_TOKEN!;
  const igUserId = process.env.IG_BUSINESS_ACCOUNT_ID!;
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
    "children{id,media_type,media_url,thumbnail_url}",
  ].join(",");

  const url = `${GRAPH_BASE}/${igUserId}/media?fields=${encodeURIComponent(
    fields
  )}&limit=${SYNC_LIMIT}&access_token=${token}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph API ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: IgMedia[] };
  return json.data ?? [];
}

/**
 * Sincronizza i post Instagram: fetch dalla Graph API, mirror immagini su Blob
 * per i post nuovi, upsert metadati, prune dei post in eccesso.
 * Idempotente: i post già presenti non vengono ri-scaricati.
 */
export async function syncInstagram(
  options: InstagramSyncOptions = {}
): Promise<InstagramSyncResult> {
  const deadline = Date.now() + (options.budgetMs ?? DEFAULT_BUDGET_MS);
  const result: InstagramSyncResult = {
    ok: false,
    fetched: 0,
    created: 0,
    updated: 0,
    pruned: 0,
    remaining: 0,
  };

  if (!isInstagramConfigured()) {
    result.reason =
      "Credenziali Instagram non configurate (IG_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID)";
    return result;
  }

  const media = await fetchInstagramMedia();
  result.fetched = media.length;

  const existing = await prisma.instagramPost.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((p) => p.id));

  for (const m of media) {
    if (existingIds.has(m.id)) {
      // Post già mirrorato: aggiorno solo i metadati testuali (caption può cambiare).
      await prisma.instagramPost.update({
        where: { id: m.id },
        data: { caption: m.caption ?? null, permalink: m.permalink },
      });
      result.updated++;
      continue;
    }

    if (Date.now() >= deadline) {
      result.remaining++;
      continue;
    }

    const blobUrls = await mirrorMediaImages(m);
    if (blobUrls.length === 0) continue; // niente immagine utilizzabile, salto

    await prisma.instagramPost.create({
      data: {
        id: m.id,
        caption: m.caption ?? null,
        mediaType: m.media_type,
        permalink: m.permalink,
        timestamp: new Date(m.timestamp),
        blobUrls,
        thumbnailUrl: m.media_type === "VIDEO" ? (blobUrls[0] ?? null) : null,
      },
    });
    result.created++;
  }

  // Prune: mantieni solo i MAX_POSTS più recenti, elimina gli altri + i Blob.
  const toPrune = await prisma.instagramPost.findMany({
    orderBy: { timestamp: "desc" },
    skip: MAX_POSTS,
    select: { id: true, blobUrls: true },
  });
  for (const post of toPrune) {
    await Promise.all(post.blobUrls.map((u) => deleteImage(u)));
    await prisma.instagramPost.delete({ where: { id: post.id } });
    result.pruned++;
  }

  result.ok = true;
  return result;
}
