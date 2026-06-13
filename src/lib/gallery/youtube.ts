// Recupero dei video del canale YouTube tramite il feed RSS pubblico.
// Vantaggi: nessuna API key, nessuna dipendenza, nessun token da rinnovare.
// Limite: il feed RSS espone solo gli ultimi ~15 video del canale.

export interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string; // ISO
  thumbnail: string; // hqdefault
  url: string;
}

/** True se il canale YouTube è configurato. */
export function isYouTubeConfigured(): boolean {
  return !!process.env.YOUTUBE_CHANNEL_ID;
}

/**
 * Ritorna gli ultimi video del canale. Cacheato per `revalidate` secondi
 * (default 1h) per non interrogare YouTube ad ogni richiesta.
 * In caso di errore o canale non configurato ritorna [] (fail-soft).
 */
export async function getChannelVideos(limit = 12, revalidate = 3600): Promise<YouTubeVideo[]> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId) return [];

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  let xml: string;
  try {
    const res = await fetch(feedUrl, { next: { revalidate } });
    if (!res.ok) return [];
    xml = await res.text();
  } catch (err) {
    console.error("[youtube] fetch feed fallito:", err);
    return [];
  }

  const videos: YouTubeVideo[] = [];
  // Ogni <entry> è un video. Estraggo i campi con regex mirate (feed ben formato).
  const entries = xml.split("<entry>").slice(1);
  for (const entry of entries) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    if (!id) continue;
    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    videos.push({
      id,
      title: decodeXmlEntities(title),
      publishedAt,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
    if (videos.length >= limit) break;
  }
  return videos;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
