import type { SuggestionCategory } from "@prisma/client";
import type { OutgoingNotice } from "@/lib/notifications/matchNotify";

/**
 * Avvisi sui suggerimenti: uno nuovo (allo staff), una nota o una risposta
 * (allo staff che ha già scritto lì) e una risposta (a chi ha scritto il
 * suggerimento, senza il nome dello staff). Funzioni pure.
 */

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  APP: "App / sito",
  ALLENAMENTI: "Allenamenti",
  PARTITE_EVENTI: "Partite ed eventi",
  ALTRO: "Altro",
};

/** Testo su una riga sola, tagliato sulla parola con "…" se supera `max`. */
export function excerpt(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function adminSuggestionUrl(id: string): string {
  return `/admin/suggerimenti?apri=${id}`;
}

function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

export function newSuggestionNotice(
  s: { id: string; category: SuggestionCategory; message: string; authorId: string | null },
  staffIds: string[]
): OutgoingNotice | null {
  const ids = staffIds.filter((id) => id !== s.authorId);
  if (ids.length === 0) return null;
  return {
    type: "SUGGESTION",
    ids,
    title: "Nuovo suggerimento",
    body: `${SUGGESTION_CATEGORY_LABELS[s.category]}: ${excerpt(s.message)}`,
    url: adminSuggestionUrl(s.id),
  };
}

export interface NoteNoticesInput {
  suggestionId: string;
  /** `Suggestion.userId`. */
  suggestionAuthorId: string | null;
  /** Chi scrive ora. */
  writerId: string;
  writerName: string | null;
  /** Autori delle note già presenti. */
  previousNoteAuthorIds: string[];
  body: string;
  isReply: boolean;
}

export function noteNotices(input: NoteNoticesInput): OutgoingNotice[] {
  const notices: OutgoingNotice[] = [];

  // Su una risposta chi ha scritto il suggerimento riceve l'avviso da autore, mai
  // due. Su una nota interna, se è staff e ha già scritto lì, è un partecipante.
  const partecipanti = [...new Set(input.previousNoteAuthorIds)].filter(
    (id) => id !== input.writerId && !(input.isReply && id === input.suggestionAuthorId)
  );
  if (partecipanti.length > 0) {
    notices.push({
      type: "SUGGESTION",
      ids: partecipanti,
      title: input.isReply
        ? "Risposta inviata all'autore di un suggerimento"
        : "Nuova nota su un suggerimento",
      body: `${firstName(input.writerName) ?? "Lo staff"}: ${excerpt(input.body)}`,
      url: adminSuggestionUrl(input.suggestionId),
    });
  }

  if (
    input.isReply &&
    input.suggestionAuthorId !== null &&
    input.suggestionAuthorId !== input.writerId
  ) {
    notices.push({
      type: "SUGGESTION",
      ids: [input.suggestionAuthorId],
      title: "Lo staff ha risposto al tuo suggerimento",
      body: excerpt(input.body),
      url: `/profilo/suggerimenti#s-${input.suggestionId}`,
    });
  }
  return notices;
}
