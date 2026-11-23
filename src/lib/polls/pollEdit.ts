/**
 * Modificare una domanda a cui le persone hanno già risposto (sondaggi delle
 * news, extra degli eventi). Regola unica: le risposte stanno attaccate all'id
 * dell'opzione, quindi un salvataggio aggiorna le opzioni e non le ricrea, e
 * cancella delle risposte solo dopo una conferma esplicita di chi modifica.
 */

export const ANSWERS_WOULD_BE_LOST = "ANSWERS_WOULD_BE_LOST";

export interface LostAnswers {
  label: string;
  count: number;
}

export interface AnswerLossConflict {
  error: string;
  code: typeof ANSWERS_WOULD_BE_LOST;
  lost: LostAnswers[];
}

interface ExistingOption {
  id: string;
  text: string;
}

interface IncomingOption {
  id?: string;
  text: string;
  order: number;
}

export interface PollOptionsPlan {
  update: { id: string; text: string; order: number }[];
  create: { text: string; order: number }[];
  removeIds: string[];
}

/**
 * Abbina le opzioni in arrivo a quelle salvate: prima per id, poi (per le pagine
 * della versione precedente, ancora aperte, che non mandano l'id) per testo.
 */
export function planPollOptions(
  existing: ExistingOption[],
  incoming: IncomingOption[]
): PollOptionsPlan {
  const free = new Map(existing.map((o) => [o.id, o]));
  const matched = new Map<IncomingOption, string>();

  for (const o of incoming) {
    if (o.id && free.delete(o.id)) matched.set(o, o.id);
  }
  for (const o of incoming) {
    if (matched.has(o)) continue;
    const sameText = [...free.values()].find((e) => e.text.trim() === o.text.trim());
    if (sameText) {
      free.delete(sameText.id);
      matched.set(o, sameText.id);
    }
  }

  const plan: PollOptionsPlan = { update: [], create: [], removeIds: [...free.keys()] };
  for (const o of incoming) {
    const id = matched.get(o);
    if (id) plan.update.push({ id, text: o.text, order: o.order });
    else plan.create.push({ text: o.text, order: o.order });
  }
  return plan;
}

/** Le opzioni tolte che hanno delle risposte, con quante ne perderebbero. */
export function lostAnswers(
  removed: { label: string; id: string }[],
  counts: ReadonlyMap<string, number>
): LostAnswers[] {
  return removed
    .map((o) => ({ label: o.label, count: counts.get(o.id) ?? 0 }))
    .filter((o) => o.count > 0);
}

/** Il corpo della risposta 409 che chiede conferma prima di cancellare. */
export function answerLossConflict(lost: LostAnswers[]): AnswerLossConflict {
  return {
    error: "Questa modifica cancellerebbe delle risposte già date",
    code: ANSWERS_WOULD_BE_LOST,
    lost,
  };
}

/** Il testo della conferma: dice cosa si perde, opzione per opzione. */
export function answerLossMessage(lost: LostAnswers[]): string {
  const list = lost
    .map((o) => `"${o.label}" (${o.count} ${o.count === 1 ? "risposta" : "risposte"})`)
    .join(", ");
  return `Salvando si cancellano le risposte date a: ${list}. L'azione non si può annullare.`;
}

/** Legge dalla risposta la richiesta di conferma, se è quella. Non consuma `res`. */
export async function readAnswerLoss(res: Response): Promise<LostAnswers[] | null> {
  if (res.status !== 409) return null;
  if (!res.headers.get("content-type")?.includes("application/json")) return null;
  const data = (await res
    .clone()
    .json()
    .catch(() => null)) as Partial<AnswerLossConflict> | null;
  return data?.code === ANSWERS_WOULD_BE_LOST && Array.isArray(data.lost) ? data.lost : null;
}
