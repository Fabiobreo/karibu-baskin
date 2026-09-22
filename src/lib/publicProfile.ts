import type { AppRole, Prisma } from "@prisma/client";

/**
 * Chi, tra gli `User`, ha un profilo pubblico su `/giocatori/[slug]`.
 *
 * - `GUEST`: mai, l'account non è ancora un tesserato.
 * - `PARENT`: solo se è anche parte attiva di una squadra, cioè ha un ruolo
 *   Baskin **e** ha giocato almeno una partita ufficiale (una riga in
 *   `PlayerMatchStats`). Un genitore che accompagna il figlio non è un
 *   giocatore e non deve comparire in ricerca, sitemap o con una pagina sua.
 * - Tutti gli altri (`ATHLETE`, `COACH`, `ADMIN`): sì.
 *
 * I `Child` non passano di qui: sono atleti per definizione (le regole sui
 * minori restano in `@/lib/minors`).
 *
 * Usato da: profilo pubblico e sua immagine OG, confronto giocatori,
 * `/api/search`, `sitemap.ts`. Chi linka un profilo deve usare la stessa regola,
 * altrimenti il link porta a un 404.
 */

export interface PublicProfileSubject {
  appRole: AppRole;
  sportRole: number | null;
  /** Partite ufficiali giocate (righe `PlayerMatchStats`). */
  matchesPlayed: number;
}

export function userHasPublicProfile(u: PublicProfileSubject): boolean {
  if (u.appRole === "GUEST") return false;
  if (u.appRole === "PARENT") return u.sportRole != null && u.matchesPlayed > 0;
  return true;
}

/** Stessa regola di `userHasPublicProfile`, come filtro Prisma su `User`. */
export function publicProfileUserFilter(): Prisma.UserWhereInput {
  return {
    OR: [
      { appRole: { notIn: ["GUEST", "PARENT"] } },
      { appRole: "PARENT", sportRole: { not: null }, matchStats: { some: {} } },
    ],
  };
}

/**
 * Campi `User` che servono a `withProfileLink`, da aggiungere alla `select`
 * insieme a `id`, `slug` e `sportRole` (che le liste selezionano già).
 */
export const PUBLIC_PROFILE_SELECT = {
  appRole: true,
  _count: { select: { matchStats: true } },
} satisfies Prisma.UserSelect;

interface ProfileLinkInput {
  id: string;
  slug: string | null;
  appRole: AppRole;
  sportRole: number | null;
  _count: { matchStats: number };
}

/**
 * Per le liste che linkano i profili (rose, convocati, iscritti): `slug`
 * diventa il segmento da linkare (lo slug, o l'id se manca: la pagina risolve
 * entrambi) oppure `null` se l'utente non ha un profilo pubblico, così il nome
 * resta ma senza un link verso un 404. Toglie `appRole` e `_count`, che
 * servono solo a decidere e non devono arrivare al client.
 */
export function withProfileLink<T extends ProfileLinkInput>(
  u: T
): Omit<T, "appRole" | "_count"> & { slug: string | null } {
  const { appRole, _count, ...rest } = u;
  const isPublic = userHasPublicProfile({
    appRole,
    sportRole: u.sportRole,
    matchesPlayed: _count.matchStats,
  });
  return { ...rest, slug: isPublic ? (u.slug ?? u.id) : null };
}
