/**
 * Casualità ripetibile: stesso seme, stessa sequenza. Usata dalla generazione
 * delle squadre degli allenamenti (seme = id dell'allenamento) e dalle sfide
 * del quiz (seme = codice nel link, UX-61).
 */

/** Mulberry32: veloce, deterministico, abbastanza buono per mescolare. */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seme numerico da una stringa qualunque. */
export function stringToSeed(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** Fisher-Yates con il PRNG seminato: non tocca l'array di partenza. */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
