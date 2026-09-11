// Sliding window in-memory rate limiter per IP.
// Works per-instance (no cross-replica coordination) — adequate for this app's scale.
//
// Limite noto: su Vercel ogni istanza serverless ha la sua mappa, quindi il
// limite effettivo si moltiplica per il numero di istanze attive e si azzera a
// ogni cold start. Frena un singolo client insistente, non un attacco
// distribuito: per quello servirebbe uno store condiviso.

interface WindowEntry {
  timestamps: number[];
  /** Finestra con cui la chiave è stata usata l'ultima volta: serve alla pulizia. */
  windowMs: number;
}

const store = new Map<string, WindowEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

/**
 * Rimuove le chiavi che non hanno richieste nella propria finestra.
 *
 * Prima si eliminavano solo le chiavi con l'elenco già vuoto, ma un elenco si
 * svuota soltanto quando la stessa chiave viene interrogata di nuovo: gli IP
 * visti una volta sola restavano in memoria per sempre, e su un'istanza
 * longeva la mappa cresceva senza limite.
 */
function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    const cutoff = now - entry.windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function checkRateLimit(
  ip: string,
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanup(now);
  const storeKey = `${key}:${ip}`;
  const cutoff = now - windowMs;

  const entry = store.get(storeKey) ?? { timestamps: [], windowMs };
  entry.windowMs = windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  entry.timestamps.push(now);
  store.set(storeKey, entry);

  const count = entry.timestamps.length;
  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
  };
}

/** Numero di chiavi in memoria. Per test e diagnostica. */
export function rateLimitStoreSize(): number {
  return store.size;
}

export function getClientIp(req: { headers: { get: (k: string) => string | null } }): string {
  // Prefer x-real-ip (set by Vercel proxy, not spoofable by clients).
  // Fall back to the last segment of XFF — the rightmost entry is added by the closest
  // trusted proxy, preventing client-side spoofing via a crafted X-Forwarded-For header.
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    return parts[parts.length - 1]?.trim() ?? "unknown";
  }
  return "unknown";
}
