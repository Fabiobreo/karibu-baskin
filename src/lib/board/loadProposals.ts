import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseDrillContent, EMPTY_DRILL_CONTENT } from "@/lib/schemas/drill";
import { ADMIN_SUGGESTION_SELECT, toAdminSuggestion } from "@/lib/suggestions/adminSuggestion";
import type { DrillContent } from "./content";
import { proposalState, type ProposalState } from "./proposals";

/**
 * Letture delle proposte di esercizi (UX-73). L'autore vede le sue, con le
 * sole risposte dello staff; lo staff le vede tutte, con il nome di chi le ha
 * fatte (le proposte sono firmate, eccezione chiusa all'anonimato dei
 * suggerimenti) ma mai il suo id.
 */

const PROPOSAL_SELECT = {
  id: true,
  slug: true,
  title: true,
  kind: true,
  court: true,
  description: true,
  status: true,
  visibility: true,
  content: true,
  showAuthor: true,
  createdById: true,
  proposedAt: true,
  adoptedAt: true,
  archivedAt: true,
  publishedAt: true,
  suggestionId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DrillSelect;

type ProposalRow = Prisma.DrillGetPayload<{ select: typeof PROPOSAL_SELECT }>;

/** Tutte le proposte fatte da una persona, anche adottate (finche' lo e' l'autore). */
export const proposalsOfWhere = (userId: string) =>
  ({
    createdById: userId,
    OR: [{ status: "PROPOSED" }, { adoptedAt: { not: null } }],
  }) satisfies Prisma.DrillWhereInput;

export interface MyProposal {
  id: string;
  slug: string;
  title: string;
  kind: ProposalRow["kind"];
  court: ProposalRow["court"];
  description: string | null;
  showAuthor: boolean;
  state: ProposalState;
  content: DrillContent;
  suggestionId: string | null;
  updatedAt: string;
}

function toMine(row: ProposalRow): MyProposal {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    court: row.court,
    description: row.description,
    showAuthor: row.showAuthor,
    state: proposalState(row),
    content: parseDrillContent(row.content, row.court) ?? EMPTY_DRILL_CONTENT,
    suggestionId: row.suggestionId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Le proposte di chi guarda, dalla piu' recente. */
export async function loadMyProposals(userId: string): Promise<MyProposal[]> {
  const rows = await prisma.drill.findMany({
    where: proposalsOfWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: PROPOSAL_SELECT,
  });
  return rows.map(toMine);
}

/** Una proposta dell'autore da modificare. `null` = non c'e' o non e' sua. */
export async function loadMyProposal(id: string, userId: string): Promise<MyProposal | null> {
  const row = await prisma.drill.findFirst({
    where: { id, ...proposalsOfWhere(userId) },
    select: PROPOSAL_SELECT,
  });
  return row ? toMine(row) : null;
}

// ── Pannello ───────────────────────────────────────────────────────────────

/** Proposte inviate (le bozze dell'autore non arrivano allo staff), con il nome. */
export const ADMIN_PROPOSALS_WHERE = {
  status: "PROPOSED",
  proposedAt: { not: null },
} satisfies Prisma.DrillWhereInput;

/**
 * Proposte nuove: inviate, non messe da parte, e che nessuno dello staff ha
 * ancora aperto o commentato (il suggerimento collegato e' ancora `NUOVO`).
 * E' il numero sulla scheda Proposte (e, per la dashboard, `countNewProposals`).
 */
export const NEW_PROPOSALS_WHERE = {
  ...ADMIN_PROPOSALS_WHERE,
  archivedAt: null,
  suggestion: { status: "NUOVO" },
} satisfies Prisma.DrillWhereInput;

export const countNewProposals = () => prisma.drill.count({ where: NEW_PROPOSALS_WHERE });

/** Lo staff ha aperto la proposta: non e' piu' nuova. */
export async function markProposalSeen(suggestionId: string) {
  await prisma.suggestion.updateMany({
    where: { id: suggestionId, status: "NUOVO" },
    data: { status: "LETTO" },
  });
}

const ADMIN_PROPOSAL_SELECT = {
  ...PROPOSAL_SELECT,
  createdBy: { select: { name: true } },
  suggestion: { select: { status: true } },
} satisfies Prisma.DrillSelect;

export interface AdminProposalRow {
  id: string;
  title: string;
  kind: ProposalRow["kind"];
  court: ProposalRow["court"];
  authorName: string | null;
  proposedAt: string;
  /** Nessuna nota dello staff ancora: e' "nuova". */
  isNew: boolean;
  archived: boolean;
  content: DrillContent;
}

export async function loadAdminProposals(): Promise<AdminProposalRow[]> {
  const rows = await prisma.drill.findMany({
    where: ADMIN_PROPOSALS_WHERE,
    orderBy: { proposedAt: "desc" },
    select: ADMIN_PROPOSAL_SELECT,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    court: r.court,
    authorName: r.createdBy?.name ?? null,
    proposedAt: (r.proposedAt ?? r.createdAt).toISOString(),
    isNew: r.suggestion?.status === "NUOVO",
    archived: r.archivedAt !== null,
    content: parseDrillContent(r.content, r.court) ?? EMPTY_DRILL_CONTENT,
  }));
}

/** Una proposta per la sua pagina nel pannello, con il filo del suggerimento. */
export async function loadAdminProposal(id: string) {
  const row = await prisma.drill.findFirst({
    where: { id, ...ADMIN_PROPOSALS_WHERE },
    select: {
      ...ADMIN_PROPOSAL_SELECT,
      suggestion: { select: ADMIN_SUGGESTION_SELECT },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    court: row.court,
    description: row.description,
    authorName: row.createdBy?.name ?? null,
    proposedAt: (row.proposedAt ?? row.createdAt).toISOString(),
    archived: row.archivedAt !== null,
    content: parseDrillContent(row.content, row.court) ?? EMPTY_DRILL_CONTENT,
    suggestion: row.suggestion ? toAdminSuggestion(row.suggestion) : null,
  };
}

export type AdminProposal = NonNullable<Awaited<ReturnType<typeof loadAdminProposal>>>;
