/**
 * Chiavi dei giocatori e seme del simulatore sfida, condivisi fra client e
 * server.
 *
 * Qui non c'è nessun dato di rating, di proposito: il client sceglie chi
 * schierare e riceve solo il risultato. Il TrueSkill resta sul server (vedi
 * `simulatorServer.ts`), perché è pensato come visibile solo allo staff.
 */

export type SimPlayerKind = "user" | "child";

export function simPlayerKey(kind: SimPlayerKind, id: string): string {
  return `${kind}-${id}`;
}

/** Inverso di `simPlayerKey`. Rifiuta tutto ciò che non ha la forma attesa. */
export function parseSimPlayerKey(key: string): { kind: SimPlayerKind; id: string } | null {
  const m = /^(user|child)-([A-Za-z0-9_-]{1,64})$/.exec(key);
  return m ? { kind: m[1] as SimPlayerKind, id: m[2] } : null;
}

/** Seme riproducibile: stesse formazioni e stesso nonce danno lo stesso risultato. */
export function buildSimSeed(a: string[], b: string[], nonce: number): string {
  return `${[...a].sort().join(",")}|${[...b].sort().join(",")}|${nonce}`;
}
