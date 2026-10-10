import { prisma } from "@/lib/db";
import {
  checkRegistrationAllowed,
  hasRestrictions,
  type SessionRestrictions,
} from "@/lib/registrationRestrictions";

export interface AudienceUser {
  id: string;
  appRole: string;
  sportRole: number | null;
  inRestrictedTeam: boolean;
  hasAnyTeam: boolean;
  /** Genitori della sua scheda figlio, se ne ha una: ricevono lo stesso avviso. */
  guardianIds?: string[];
}

export interface AudienceChild {
  sportRole: number | null;
  inRestrictedTeam: boolean;
  /** Genitori e, se ne ha uno, l'account del figlio: chi riceve l'avviso. */
  notifyUserIds: string[];
}

// Senza ruolo Baskin non si sa se i ruoli ammessi lo includono: 0 non e' in
// nessuna lista, quindi decide solo la squadra (come per chi non ha ancora
// fatto il questionario e non ha un ruolo da mandare col modulo).
const NO_ROLE = 0;

function roleFits(restrictions: SessionRestrictions, sportRole: number | null): boolean {
  return sportRole != null || restrictions.allowedRoles.length === 0;
}

/**
 * Chi riceve l'avviso di un allenamento: esattamente chi potrebbe iscriversi,
 * con le stesse regole della POST /api/registrations (`checkRegistrationAllowed`).
 * `null` = allenamento senza restrizioni, cioe' tutti.
 *
 * Replica anche i due casi particolari della rotta: un utente senza nessuna
 * squadra non e' fermato dalla restrizione di squadra, un figlio si'.
 */
export function sessionAudience(
  restrictions: SessionRestrictions,
  users: AudienceUser[],
  children: AudienceChild[]
): string[] | null {
  if (!hasRestrictions(restrictions)) return null;
  const ids = new Set<string>();

  for (const u of users) {
    const isStaff = u.appRole === "COACH" || u.appRole === "ADMIN";
    if (!isStaff && !roleFits(restrictions, u.sportRole)) continue;
    const inTeam = restrictions.restrictTeamId ? u.inRestrictedTeam || !u.hasAnyTeam : false;
    const check = checkRegistrationAllowed(
      restrictions,
      u.appRole,
      u.sportRole ?? NO_ROLE,
      inTeam,
      isStaff
    );
    if (check.allowed) {
      ids.add(u.id);
      for (const id of u.guardianIds ?? []) ids.add(id);
    }
  }

  for (const c of children) {
    if (!roleFits(restrictions, c.sportRole)) continue;
    const check = checkRegistrationAllowed(
      restrictions,
      "ATHLETE",
      c.sportRole ?? NO_ROLE,
      c.inRestrictedTeam
    );
    if (check.allowed) for (const id of c.notifyUserIds) ids.add(id);
  }

  return [...ids];
}

/** Carica utenti e figli dal DB e calcola `sessionAudience`. */
export async function loadSessionAudience(
  restrictions: SessionRestrictions
): Promise<string[] | null> {
  if (!hasRestrictions(restrictions)) return null;
  const teamId = restrictions.restrictTeamId;

  const [users, children] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        appRole: true,
        sportRole: true,
        teamMemberships: { select: { teamId: true } },
        childAccount: { select: { guardians: { select: { userId: true } } } },
      },
    }),
    // Solo i figli senza account: chi ha un account è valutato come account
    // (ruolo e squadra sono i suoi) e porta con sé i genitori.
    prisma.child.findMany({
      where: { userId: null },
      select: {
        sportRole: true,
        userId: true,
        guardians: { select: { userId: true } },
        teamMemberships: { select: { teamId: true } },
      },
    }),
  ]);

  return sessionAudience(
    restrictions,
    users.map((u) => ({
      id: u.id,
      appRole: u.appRole,
      sportRole: u.sportRole,
      inRestrictedTeam: !!teamId && u.teamMemberships.some((m) => m.teamId === teamId),
      hasAnyTeam: u.teamMemberships.length > 0,
      guardianIds: u.childAccount?.guardians.map((g) => g.userId) ?? [],
    })),
    children.map((c) => ({
      sportRole: c.sportRole,
      inRestrictedTeam: !!teamId && c.teamMemberships.some((m) => m.teamId === teamId),
      notifyUserIds: [...c.guardians.map((g) => g.userId), ...(c.userId ? [c.userId] : [])],
    }))
  );
}
