// Helper per calcolare candidati + statistiche di convocazione per una
// singola squadra. Usato dalla pagina /admin/partite/[matchId]/convocazioni
// per supportare sia partite "normali" (1 squadra) sia amichevoli interne
// (2 squadre, una per lato del match).

import { prisma } from "@/lib/db";
import { computeCandidateStats } from "@/lib/callupStats";
import type {
  CandidateInput,
  SessionEligibilityInput,
  RegistrationLookup,
  CallupLookup,
} from "@/lib/callupStats";

export interface TeamCallupContext {
  id: string;
  name: string;
  color: string | null;
  season: string;
  stats: Array<{
    candidate: CandidateInput;
    presences: number;
    absences: number;
    eligibleSessions: number;
    seasonCallups: number;
    daysSinceLastCallup: number | null;
    availability: boolean | null; // true=disponibile, false=non disponibile, null=non risposto
  }>;
  initialSelectedUserIds: string[];
  initialSelectedChildIds: string[];
}

const WINDOW_DAYS = 14;

interface BuildArgs {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  teamSeason: string;
  matchId: string;
  now: Date;
}

export async function buildTeamCallupContext({
  teamId,
  teamName,
  teamColor,
  teamSeason,
  matchId,
  now,
}: BuildArgs): Promise<TeamCallupContext> {
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Convocazioni esistenti per QUESTO lato (teamId esplicito).
  // I record legacy con teamId NULL sono semanticamente "lato match.teamId" —
  // ma qui sappiamo già il teamId esplicito, quindi se nessun record matcha
  // proviamo il fallback (per backward compat con partite vecchie).
  const existingExplicit = await prisma.matchCallup.findMany({
    where: { matchId, teamId },
    select: { userId: true, childId: true },
  });
  // Fallback legacy: solo se non ci sono record espliciti
  const existingCallups =
    existingExplicit.length > 0
      ? existingExplicit
      : await prisma.matchCallup.findMany({
          where: { matchId, teamId: null },
          select: { userId: true, childId: true },
        });

  const [memberships, windowSessions, allUserMemberships, allChildMemberships] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            sportRole: true,
            sportRoleVariant: true,
          },
        },
        child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
      },
    }),
    prisma.trainingSession.findMany({
      where: {
        date: { gte: windowStart, lt: now },
        managedAt: { not: null },
      },
      select: {
        id: true,
        date: true,
        managedAt: true,
        allowedRoles: true,
        restrictTeamId: true,
        openRoles: true,
      },
    }),
    prisma.teamMembership.findMany({
      where: { teamId, userId: { not: null } },
      select: { userId: true },
    }),
    prisma.teamMembership.findMany({
      where: { teamId, childId: { not: null } },
      select: { childId: true },
    }),
  ]);

  const rosterUserIds = allUserMemberships.map((m) => m.userId!).filter(Boolean);
  const rosterChildIds = allChildMemberships.map((m) => m.childId!).filter(Boolean);

  const [allMembershipsOfRosterUsers, allMembershipsOfRosterChildren] = await Promise.all([
    rosterUserIds.length > 0
      ? prisma.teamMembership.findMany({
          where: { userId: { in: rosterUserIds } },
          select: { userId: true, teamId: true },
        })
      : Promise.resolve([] as { userId: string | null; teamId: string }[]),
    rosterChildIds.length > 0
      ? prisma.teamMembership.findMany({
          where: { childId: { in: rosterChildIds } },
          select: { childId: true, teamId: true },
        })
      : Promise.resolve([] as { childId: string | null; teamId: string }[]),
  ]);

  const teamIdsByUserId = new Map<string, string[]>();
  for (const m of allMembershipsOfRosterUsers) {
    if (!m.userId) continue;
    const arr = teamIdsByUserId.get(m.userId) ?? [];
    arr.push(m.teamId);
    teamIdsByUserId.set(m.userId, arr);
  }
  const teamIdsByChildId = new Map<string, string[]>();
  for (const m of allMembershipsOfRosterChildren) {
    if (!m.childId) continue;
    const arr = teamIdsByChildId.get(m.childId) ?? [];
    arr.push(m.teamId);
    teamIdsByChildId.set(m.childId, arr);
  }

  const candidates: CandidateInput[] = memberships
    .map((m): CandidateInput | null => {
      if (m.userId && m.user) {
        return {
          kind: "user",
          id: m.userId,
          name: m.user.name ?? "—",
          image: m.user.image,
          sportRole: m.user.sportRole,
          sportRoleVariant: m.user.sportRoleVariant,
          isCaptain: m.isCaptain,
          teamIds: teamIdsByUserId.get(m.userId) ?? [teamId],
        };
      }
      if (m.childId && m.child) {
        return {
          kind: "child",
          id: m.childId,
          name: m.child.name,
          image: null,
          sportRole: m.child.sportRole,
          sportRoleVariant: m.child.sportRoleVariant,
          isCaptain: m.isCaptain,
          teamIds: teamIdsByChildId.get(m.childId) ?? [teamId],
        };
      }
      return null;
    })
    .filter((c): c is CandidateInput => c !== null)
    .sort((a, b) => (a.sportRole ?? 99) - (b.sportRole ?? 99) || a.name.localeCompare(b.name));

  const candidateUserIds = candidates.filter((c) => c.kind === "user").map((c) => c.id);
  const candidateChildIds = candidates.filter((c) => c.kind === "child").map((c) => c.id);

  const sessionIds = windowSessions.map((s) => s.id);
  const registrations =
    sessionIds.length > 0 && (candidateUserIds.length > 0 || candidateChildIds.length > 0)
      ? await prisma.registration.findMany({
          where: {
            sessionId: { in: sessionIds },
            OR: [
              candidateUserIds.length > 0 ? { userId: { in: candidateUserIds } } : null,
              candidateChildIds.length > 0 ? { childId: { in: candidateChildIds } } : null,
            ].filter((x): x is NonNullable<typeof x> => x !== null),
          },
          select: { sessionId: true, userId: true, childId: true, attended: true },
        })
      : [];

  const seasonCallups =
    candidateUserIds.length > 0 || candidateChildIds.length > 0
      ? await prisma.matchCallup.findMany({
          where: {
            matchId: { not: matchId },
            match: { team: { season: teamSeason } },
            OR: [
              candidateUserIds.length > 0 ? { userId: { in: candidateUserIds } } : null,
              candidateChildIds.length > 0 ? { childId: { in: candidateChildIds } } : null,
            ].filter((x): x is NonNullable<typeof x> => x !== null),
          },
          select: {
            matchId: true,
            userId: true,
            childId: true,
            match: { select: { date: true } },
          },
        })
      : [];

  const windowSessionsInput: SessionEligibilityInput[] = windowSessions.map((s) => ({
    id: s.id,
    date: s.date,
    managedAt: s.managedAt,
    allowedRoles: s.allowedRoles,
    restrictTeamId: s.restrictTeamId,
    openRoles: s.openRoles,
  }));

  const regLookup: RegistrationLookup[] = registrations.map((r) => ({
    sessionId: r.sessionId,
    userId: r.userId,
    childId: r.childId,
    attended: r.attended,
  }));

  const callupLookup: CallupLookup[] = seasonCallups.map((c) => ({
    matchId: c.matchId,
    matchDate: c.match.date,
    userId: c.userId,
    childId: c.childId,
  }));

  const availabilities =
    candidateUserIds.length > 0 || candidateChildIds.length > 0
      ? await prisma.matchAvailability.findMany({
          where: {
            matchId,
            OR: [
              candidateUserIds.length > 0 ? { userId: { in: candidateUserIds } } : null,
              candidateChildIds.length > 0 ? { childId: { in: candidateChildIds } } : null,
            ].filter((x): x is NonNullable<typeof x> => x !== null),
          },
          select: { userId: true, childId: true, available: true },
        })
      : [];

  const availByUserId = new Map<string, boolean>();
  const availByChildId = new Map<string, boolean>();
  for (const a of availabilities) {
    if (a.userId) availByUserId.set(a.userId, a.available);
    if (a.childId) availByChildId.set(a.childId, a.available);
  }

  const stats = computeCandidateStats({
    candidates,
    windowSessions: windowSessionsInput,
    registrations: regLookup,
    callups: callupLookup,
    referenceDate: now,
  });

  return {
    id: teamId,
    name: teamName,
    color: teamColor,
    season: teamSeason,
    stats: stats.map((s) => ({
      candidate: s.candidate,
      presences: s.presences,
      absences: s.absences,
      eligibleSessions: s.eligibleSessions,
      seasonCallups: s.seasonCallups,
      daysSinceLastCallup: s.daysSinceLastCallup,
      // Default: chi non ha risposto è considerato NON disponibile.
      availability:
        s.candidate.kind === "user"
          ? (availByUserId.get(s.candidate.id) ?? false)
          : (availByChildId.get(s.candidate.id) ?? false),
    })),
    initialSelectedUserIds: existingCallups.map((c) => c.userId).filter((id): id is string => !!id),
    initialSelectedChildIds: existingCallups
      .map((c) => c.childId)
      .filter((id): id is string => !!id),
  };
}

export const WINDOW_DAYS_FOR_PRESENCES = WINDOW_DAYS;
