import { prisma } from "@/lib/db";

/**
 * I suggerimenti di un utente con le risposte dello staff. Le note interne non
 * escono mai (`isReply: true`) e nemmeno chi le ha scritte: all'autore la
 * risposta si mostra come "Lo staff". Lo stato (NUOVO/LETTO/ARCHIVIATO) è
 * interno allo staff e non si legge.
 */
export async function loadMySuggestions(userId: string) {
  return prisma.suggestion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      message: true,
      createdAt: true,
      notes: {
        where: { isReply: true }, // MAI le note interne
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true }, // MAI l'autore della nota
      },
    },
  });
}
