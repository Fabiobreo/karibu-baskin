/**
 * Risultati di un sondaggio per staff e dirigenti: quanti voti ha ogni opzione
 * e chi li ha dati. Chi vota sa che lo staff vede il suo nome (scelta del
 * committente, novembre 2026); fuori dal pannello i nomi non escono mai.
 */

export interface PollVoter {
  userId: string;
  name: string;
}

export interface PollOptionResult {
  id: string;
  text: string;
  count: number;
  voters: PollVoter[];
}

export interface PollResults {
  question: string;
  multiSelect: boolean;
  closesAt: string | null;
  /** Persone che hanno votato (con la scelta multipla una persona dà più voti). */
  voterCount: number;
  options: PollOptionResult[];
}

interface PollInput {
  question: string;
  multiSelect: boolean;
  closesAt: Date | null;
  options: { id: string; text: string; order: number }[];
  votes: { optionId: string; userId: string; user: { name: string | null } }[];
}

const NO_NAME = "Senza nome";

/** Opzioni nell'ordine del sondaggio, votanti in ordine alfabetico. */
export function summarizePoll(poll: PollInput): PollResults {
  const byOption = new Map<string, PollVoter[]>();
  for (const v of poll.votes) {
    const list = byOption.get(v.optionId) ?? [];
    list.push({ userId: v.userId, name: v.user.name?.trim() || NO_NAME });
    byOption.set(v.optionId, list);
  }
  const options = [...poll.options]
    .sort((a, b) => a.order - b.order)
    .map((o) => {
      const voters = (byOption.get(o.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "it"));
      return { id: o.id, text: o.text, count: voters.length, voters };
    });
  return {
    question: poll.question,
    multiSelect: poll.multiSelect,
    closesAt: poll.closesAt?.toISOString() ?? null,
    voterCount: new Set(poll.votes.map((v) => v.userId)).size,
    options,
  };
}
