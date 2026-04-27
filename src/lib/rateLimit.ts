// Sliding window in-memory rate limiter per IP.
// Works per-instance (no cross-replica coordination) — adequate for this app's scale.

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
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
  cleanup();
  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(storeKey) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  entry.timestamps.push(now);
  store.set(storeKey, entry);

  const count = entry.timestamps.length;
  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
  };
}

export function getClientIp(req: { headers: { get: (k: string) => string | null } }): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
