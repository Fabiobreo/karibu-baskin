import type { AppRole, DrillKind, DrillStatus, Prisma } from "@prisma/client";
import { isMemberRole } from "@/lib/authRoles";
import { isMinor } from "@/lib/minors";
import { EXERCISE_KINDS } from "./category";

/**
 * Proposte di esercizi dei tesserati (UX-73). Una proposta e' un esercizio in
 * bozza dell'autore (`Drill.status = PROPOSED`, `createdById` = autore): finche'
 * `proposedAt` e' nullo e' una bozza sua, poi e' inviata allo staff con un
 * suggerimento collegato (categoria `ESERCIZIO`) per il filo di note e
 * risposte. Lo staff la adotta (diventa una bozza dello staff) o la archivia
 * ("Non adesso"). Regole pure: le usano rotte, pagine e pannello.
 */

/** Al massimo tante proposte in attesa per persona (bozze e inviate non decise). */
export const MAX_PENDING_PROPOSALS = 3;

/** Una bozza mai inviata si cancella dopo tanti giorni (cron `cleanup-notifications`). */
export const ABANDONED_DRAFT_DAYS = 60;

/** Solo esercizi: gli schemi sono il gioco da partita della squadra e restano dello staff. */
export const PROPOSAL_KINDS: readonly DrillKind[] = EXERCISE_KINDS;

export const isProposalKind = (kind: DrillKind) => PROPOSAL_KINDS.includes(kind);

/** Propone chi ha un account da tesserato; mai gli ospiti. */
export function canPropose(role: AppRole | string | null | undefined): boolean {
  return isMemberRole(role);
}

/** I campi di un esercizio che servono a dire a che punto e' una proposta. */
export interface ProposalFields {
  status: DrillStatus;
  createdById: string | null;
  proposedAt: Date | string | null;
  adoptedAt: Date | string | null;
  archivedAt: Date | string | null;
}

/**
 * A che punto e' una proposta, per l'autore: "draft" (non ancora inviata),
 * "sent" (allo staff), "declined" ("Non adesso"), "adopted" (presa dallo
 * staff, non ancora pubblicata), "published" (nel Playbook).
 */
export type ProposalState = "draft" | "sent" | "declined" | "adopted" | "published";

export function proposalState(d: ProposalFields): ProposalState {
  if (d.adoptedAt) return d.status === "PUBLISHED" && !d.archivedAt ? "published" : "adopted";
  if (d.archivedAt) return "declined";
  return d.proposedAt ? "sent" : "draft";
}

/** E' ancora una proposta (non adottata): la vedono solo l'autore e lo staff. */
export const isProposal = (d: Pick<ProposalFields, "status" | "adoptedAt">) =>
  d.status === "PROPOSED" && !d.adoptedAt;

/** L'autore la modifica finche' non e' adottata ne' archiviata dallo staff. */
export function canEditProposal(d: ProposalFields, userId: string | null | undefined): boolean {
  return !!userId && d.createdById === userId && isProposal(d) && !d.archivedAt;
}

/** L'autore la ritira (la cancella) finche' non e' adottata, anche dopo un "Non adesso". */
export function canWithdrawProposal(d: ProposalFields, userId: string | null | undefined): boolean {
  return !!userId && d.createdById === userId && isProposal(d);
}

/** Si invia una bozza dell'autore, una volta, con almeno un pezzo in campo. */
export function canSubmitProposal(d: ProposalFields, userId: string | null | undefined): boolean {
  return canEditProposal(d, userId) && !d.proposedAt;
}

/** Lo staff adotta una proposta inviata (anche una a cui aveva detto "Non adesso"). */
export function canAdoptProposal(d: ProposalFields): boolean {
  return isProposal(d) && !!d.proposedAt;
}

/** Proposte che contano per il limite: bozze e inviate, non adottate ne' archiviate. */
export function pendingProposals<T extends ProposalFields>(rows: T[]): T[] {
  return rows.filter((d) => isProposal(d) && !d.archivedAt);
}

/** Filtro Prisma delle proposte in attesa di una persona (stessa regola). */
export const pendingProposalsWhere = (userId: string) =>
  ({
    createdById: userId,
    status: "PROPOSED",
    adoptedAt: null,
    archivedAt: null,
  }) satisfies Prisma.DrillWhereInput;

/** Bozze mai inviate e non toccate da `ABANDONED_DRAFT_DAYS` giorni. */
export function abandonedDraftsWhere(now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - ABANDONED_DRAFT_DAYS * 24 * 60 * 60 * 1000);
  return {
    status: "PROPOSED",
    proposedAt: null,
    adoptedAt: null,
    updatedAt: { lt: cutoff },
  } satisfies Prisma.DrillWhereInput;
}

export interface ProposalAuthor {
  name: string | null;
  birthDate: Date | string | null;
}

/**
 * "Idea di Marco" sotto un esercizio adottato e pubblicato (decisione del
 * committente): solo il nome di battesimo, solo a chi e' tesserato, mai su una
 * pagina che vede chiunque (un esercizio pubblico puo' finire su Google), mai
 * per un minore, mai se l'autore l'ha spenta. `null` = niente riga.
 */
export function proposalAuthorLabel(
  drill: { adoptedAt: Date | string | null; showAuthor: boolean; isPublic: boolean },
  author: ProposalAuthor | null,
  viewer: { member: boolean },
  now: Date = new Date()
): string | null {
  if (!drill.adoptedAt || !drill.showAuthor || drill.isPublic || !viewer.member) return null;
  if (!author || isMinor(author.birthDate, now)) return null;
  const first = author.name?.trim().split(/\s+/)[0];
  return first || null;
}

/** Pagina della proposta nel pannello. */
export const adminProposalPath = (id: string) => `/admin/playbook/proposte/${id}`;

/** Pagina dell'autore per disegnare o modificare una proposta. */
export const proposalEditPath = (id?: string) =>
  id ? `/playbook/proponi?id=${encodeURIComponent(id)}` : "/playbook/proponi";
