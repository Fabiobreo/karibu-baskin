import { prisma } from "@/lib/db";
import { ROLE_GROUPS, roleGroupOf, type RoleGroupKey } from "@/lib/constants";
import { rosterTeamIds } from "@/lib/matches/mixedTeam";

export interface GroupCoverage {
  groupKey: RoleGroupKey;
  label: string;
  required: number;
  available: number;
  shortfall: number;
}

export interface MatchCoverage {
  matchId: string;
  perGroup: GroupCoverage[];
  hasShortfall: boolean;
  totalAvailable: number;
  totalRoster: number;
}

/**
 * Copertura ruoli per una partita raggruppata per ROLE_GROUPS.
 * Disponibilità = TeamMembership ∩ MatchAvailability.available=true.
 * Default: chi non ha risposto è considerato NON disponibile.
 */
export async function computeMatchCoverage(matchId: string): Promise<MatchCoverage | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { team: { select: { id: true, season: true, isMixed: true } } },
  });
  if (!match) return null;

  // Karibu di stagione: la rosa è l'unione delle squadre della stagione.
  const teamIds = await rosterTeamIds([match.team]);

  const [memberships, availabilities] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { teamId: { in: teamIds } },
      select: {
        userId: true,
        childId: true,
        user: { select: { sportRole: true } },
        child: { select: { sportRole: true } },
      },
    }),
    prisma.matchAvailability.findMany({
      where: { matchId, available: true },
      select: { userId: true, childId: true },
    }),
  ]);

  return buildCoverage(matchId, memberships, availabilities);
}

/** Variante batch: una sola query per più partite. */
export async function computeMatchCoverageBatch(
  matchIds: string[]
): Promise<Map<string, MatchCoverage>> {
  const result = new Map<string, MatchCoverage>();
  if (matchIds.length === 0) return result;

  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: { id: true, team: { select: { id: true, season: true, isMixed: true } } },
  });
  // Rose da leggere per ogni partita: la squadra stessa, o per la Karibu tutte
  // le squadre della sua stagione.
  const rosterByMatch = new Map<string, string[]>();
  for (const m of matches) rosterByMatch.set(m.id, await rosterTeamIds([m.team]));
  const teamIds = Array.from(new Set([...rosterByMatch.values()].flat()));

  const [memberships, availabilities] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { teamId: { in: teamIds } },
      select: {
        teamId: true,
        userId: true,
        childId: true,
        user: { select: { sportRole: true } },
        child: { select: { sportRole: true } },
      },
    }),
    prisma.matchAvailability.findMany({
      where: { matchId: { in: matchIds }, available: true },
      select: { matchId: true, userId: true, childId: true },
    }),
  ]);

  const membershipsByTeam = new Map<string, typeof memberships>();
  for (const m of memberships) {
    const arr = membershipsByTeam.get(m.teamId) ?? [];
    arr.push(m);
    membershipsByTeam.set(m.teamId, arr);
  }

  const availByMatch = new Map<string, { userId: string | null; childId: string | null }[]>();
  for (const a of availabilities) {
    const arr = availByMatch.get(a.matchId) ?? [];
    arr.push(a);
    availByMatch.set(a.matchId, arr);
  }

  for (const match of matches) {
    const teamMemberships = (rosterByMatch.get(match.id) ?? []).flatMap(
      (tid) => membershipsByTeam.get(tid) ?? []
    );
    const avail = availByMatch.get(match.id) ?? [];
    result.set(match.id, buildCoverage(match.id, teamMemberships, avail));
  }

  return result;
}

// ── Logica condivisa ────────────────────────────────────────────────────────

type MembershipLike = {
  userId: string | null;
  childId: string | null;
  user: { sportRole: number | null } | null;
  child: { sportRole: number | null } | null;
};

function buildCoverage(
  matchId: string,
  memberships: MembershipLike[],
  availabilities: { userId: string | null; childId: string | null }[]
): MatchCoverage {
  const availableUserIds = new Set(availabilities.map((a) => a.userId).filter(Boolean) as string[]);
  const availableChildIds = new Set(
    availabilities.map((a) => a.childId).filter(Boolean) as string[]
  );

  const rosterByGroup = new Map<RoleGroupKey, number>();
  const availByGroup = new Map<RoleGroupKey, number>();

  // Chi è tesserato in due squadre compare due volte nella rosa di la Karibu.
  const seen = new Set<string>();
  for (const m of memberships) {
    const key = m.userId ? `u:${m.userId}` : `c:${m.childId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const role = m.user?.sportRole ?? m.child?.sportRole ?? null;
    const groupKey = roleGroupOf(role);
    if (!groupKey) continue;
    rosterByGroup.set(groupKey, (rosterByGroup.get(groupKey) ?? 0) + 1);
    const isAvailable =
      (m.userId && availableUserIds.has(m.userId)) ||
      (m.childId && availableChildIds.has(m.childId));
    if (isAvailable) availByGroup.set(groupKey, (availByGroup.get(groupKey) ?? 0) + 1);
  }

  const perGroup: GroupCoverage[] = ROLE_GROUPS.map((g) => {
    const available = availByGroup.get(g.key) ?? 0;
    return {
      groupKey: g.key,
      label: g.label,
      required: g.min,
      available,
      shortfall: Math.max(0, g.min - available),
    };
  });

  const totalAvailable = perGroup.reduce((s, r) => s + r.available, 0);
  const totalRoster = Array.from(rosterByGroup.values()).reduce((s, n) => s + n, 0);

  return {
    matchId,
    perGroup,
    hasShortfall: perGroup.some((r) => r.shortfall > 0),
    totalAvailable,
    totalRoster,
  };
}
