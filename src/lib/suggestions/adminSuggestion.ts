import type { Prisma } from "@prisma/client";

/**
 * Cosa legge il pannello di un suggerimento. `userId` si legge solo per sapere se
 * si può rispondere: `toAdminSuggestion` lo trasforma in `canReply` e lo toglie.
 * Lo staff non deve mai ricevere chi ha scritto il suggerimento.
 */
export const ADMIN_SUGGESTION_SELECT = {
  id: true,
  category: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  notes: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      isReply: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true, customImage: true } },
    },
  },
} as const satisfies Prisma.SuggestionSelect;

type Row = Prisma.SuggestionGetPayload<{ select: typeof ADMIN_SUGGESTION_SELECT }>;

export interface AdminSuggestionNote {
  id: string;
  body: string;
  isReply: boolean;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; customImage: string | null };
}

export interface AdminSuggestion {
  id: string;
  category: Row["category"];
  message: string;
  status: Row["status"];
  createdAt: string;
  updatedAt: string;
  /** L'autore ha ancora un account: si può rispondergli. */
  canReply: boolean;
  /** Data dell'ultima nota, o del suggerimento: serve all'ordinamento. */
  lastActivityAt: string;
  notes: AdminSuggestionNote[];
}

export function toAdminSuggestion(row: Row): AdminSuggestion {
  const notes: AdminSuggestionNote[] = row.notes.map((n) => ({
    id: n.id,
    body: n.body,
    isReply: n.isReply,
    createdAt: n.createdAt.toISOString(),
    author: {
      id: n.author.id,
      name: n.author.name,
      image: n.author.image,
      customImage: n.author.customImage,
    },
  }));
  const createdAt = row.createdAt.toISOString();
  return {
    id: row.id,
    category: row.category,
    message: row.message,
    status: row.status,
    createdAt,
    updatedAt: row.updatedAt.toISOString(),
    canReply: row.userId !== null,
    lastActivityAt: notes.length > 0 ? notes[notes.length - 1].createdAt : createdAt,
    notes,
  };
}

/** Per ultima attività, la più recente prima. Restituisce una copia. */
export function sortByActivity(items: AdminSuggestion[]): AdminSuggestion[] {
  return [...items].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
