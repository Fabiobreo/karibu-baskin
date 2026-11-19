import type { OutgoingNotice } from "@/lib/notifications/matchNotify";
import { drillPath } from "./category";
import { adminProposalPath } from "./proposals";

/**
 * Avvisi delle proposte di esercizi (UX-73), funzioni pure. Lo staff riceve
 * l'avviso dei suggerimenti (con il nome: le proposte sono firmate); l'autore
 * legge la risposta automatica dell'adozione e, alla pubblicazione, che il suo
 * esercizio e' nel Playbook.
 */

/** Risposta automatica sul filo del suggerimento quando lo staff adotta. */
export const ADOPTION_REPLY =
  "Lo staff ha preso il tuo esercizio: lo trovi nel Playbook quando sarà pubblicato.";

function firstName(name: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || null;
}

export function proposalSubmittedNotice(
  p: { drillId: string; title: string; authorId: string; authorName: string | null },
  staffIds: string[]
): OutgoingNotice | null {
  const ids = staffIds.filter((id) => id !== p.authorId);
  if (ids.length === 0) return null;
  const who = firstName(p.authorName);
  return {
    type: "SUGGESTION",
    ids,
    title: "Nuovo suggerimento",
    body: who ? `Proposta di esercizio di ${who}: ${p.title}` : `Proposta di esercizio: ${p.title}`,
    url: adminProposalPath(p.drillId),
  };
}

export function proposalAdoptedNotice(p: {
  authorId: string | null;
  actorId: string;
  suggestionId: string | null;
}): OutgoingNotice | null {
  if (!p.authorId || p.authorId === p.actorId) return null;
  return {
    type: "SUGGESTION",
    ids: [p.authorId],
    title: "Lo staff ha preso il tuo esercizio",
    body: ADOPTION_REPLY,
    url: p.suggestionId ? `/profilo/suggerimenti#s-${p.suggestionId}` : "/profilo/suggerimenti",
  };
}

export function proposalPublishedNotice(p: {
  authorId: string | null;
  actorId: string;
  title: string;
  slug: string;
}): OutgoingNotice | null {
  if (!p.authorId || p.authorId === p.actorId) return null;
  return {
    type: "SUGGESTION",
    ids: [p.authorId],
    title: "Il tuo esercizio è nel Playbook",
    body: p.title,
    url: drillPath(p.slug),
  };
}
