import type { AppRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRome } from "@/lib/dateUtils";
import { PUBLIC_PROFILE_SELECT, withProfileLink } from "@/lib/publicProfile";

/**
 * Chi compie gli anni oggi: una sola regola per il banner in home e per la
 * notifica del cron, così la notifica non nomina qualcuno che il banner non
 * mostra.
 *
 * - `User` non ospiti e `Child` (i figli senza account), solo se attivi
 *   (`athleteStatus` null): niente auguri a chi è in pausa o ha lasciato.
 * - Chi ha sia la scheda figlio sia l'account compare una volta sola.
 * - Nomi e compleanni sono dati nominativi, spesso di minori: chi usa questa
 *   lista la mostra solo ai tesserati. L'età e la data non escono mai di qui.
 */

export interface Celebrant {
  /** Chiave React: `u:<id>` o `c:<id>`. */
  key: string;
  name: string | null;
  /** Segmento di `/giocatori/…`, o `null` se la persona non ha una pagina. */
  slug: string | null;
}

interface BirthdayUser {
  id: string;
  name: string | null;
  slug: string | null;
  birthDate: Date | null;
  sportRole: number | null;
  appRole: AppRole;
  _count: { matchStats: number };
}

interface BirthdayChild {
  id: string;
  name: string;
  slug: string | null;
  birthDate: Date | null;
  userId: string | null;
}

/**
 * Giorno e mese a Roma, sia per "oggi" sia per la data di nascita: il server
 * gira in UTC e dopo mezzanotte mostrerebbe ancora i compleanni di ieri.
 */
export function isBirthdayToday(birthDate: Date | string, now: Date = new Date()): boolean {
  return formatRome(birthDate, "MM-dd") === formatRome(now, "MM-dd");
}

export function pickCelebrants(
  users: BirthdayUser[],
  children: BirthdayChild[],
  now: Date = new Date()
): Celebrant[] {
  const userCelebrants = users.filter((u) => u.birthDate && isBirthdayToday(u.birthDate, now));
  const celebratedUserIds = new Set(userCelebrants.map((u) => u.id));

  const fromUsers = userCelebrants.map((u) => {
    const linked = withProfileLink(u);
    return { key: `u:${u.id}`, name: u.name, slug: linked.slug };
  });

  const fromChildren = children
    .filter((c) => c.birthDate && isBirthdayToday(c.birthDate, now))
    // Scheda figlio collegata a un account che festeggia già: una persona sola.
    .filter((c) => !c.userId || !celebratedUserIds.has(c.userId))
    .map((c) => ({ key: `c:${c.id}`, name: c.name, slug: c.slug ?? c.id }));

  return [...fromUsers, ...fromChildren];
}

export async function loadTodayCelebrants(now: Date = new Date()): Promise<Celebrant[]> {
  const [users, children] = await Promise.all([
    prisma.user.findMany({
      where: { birthDate: { not: null }, appRole: { not: "GUEST" }, athleteStatus: null },
      select: {
        id: true,
        name: true,
        slug: true,
        birthDate: true,
        sportRole: true,
        ...PUBLIC_PROFILE_SELECT,
      },
    }),
    prisma.child.findMany({
      where: { birthDate: { not: null }, athleteStatus: null },
      select: { id: true, name: true, slug: true, birthDate: true, userId: true },
    }),
  ]);
  return pickCelebrants(users, children, now);
}
