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
    loanFrom?: string | null; // se valorizzato, è un prestito: nome della squadra di provenienza
  }>;
  initialSelectedUserIds: string[];
  initialSelectedChildIds: string[];
}

/** Candidato esterno proponibile come prestito (giocatore di un'altra squadra). */
export interface LoanCandidate {
  candidate: CandidateInput;
  teamName: string; // squadra di provenienza
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
            ratingMu: true,
            gender: true,
            height: true,
          },
        },
        child: {
          select: {
            id: true,
            name: true,
            sportRole: true,
            sportRoleVariant: true,
            ratingMu: true,
            gender: true,
            height: true,
          },
        },
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
          ratingMu: m.user.ratingMu,
          gender: m.user.gender,
          height: m.user.height,
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
          ratingMu: m.child.ratingMu,
          gender: m.child.gender,
          height: m.child.height,
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

  // Prestiti già salvati per questo lato: convocati che NON sono membri della
  // rosa. Vanno re-iniettati come righe (con statistiche neutre) così restano
  // visibili e selezionati nell'editor anche dopo un reload.
  const memberUserIdSet = new Set(candidateUserIds);
  const memberChildIdSet = new Set(candidateChildIds);
  const loanUserIds = existingCallups
    .map((c) => c.userId)
    .filter((id): id is string => !!id && !memberUserIdSet.has(id));
  const loanChildIds = existingCallups
    .map((c) => c.childId)
    .filter((id): id is string => !!id && !memberChildIdSet.has(id));

  const [loanUsers, loanChildren, loanMemberships] = await Promise.all([
    loanUserIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: loanUserIds } },
          select: {
            id: true,
            name: true,
            image: true,
            sportRole: true,
            sportRoleVariant: true,
            ratingMu: true,
            gender: true,
            height: true,
          },
        })
      : Promise.resolve([]),
    loanChildIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: loanChildIds } },
          select: {
            id: true,
            name: true,
            sportRole: true,
            sportRoleVariant: true,
            ratingMu: true,
            gender: true,
            height: true,
          },
        })
      : Promise.resolve([]),
    loanUserIds.length > 0 || loanChildIds.length > 0
      ? prisma.teamMembership.findMany({
          where: {
            team: { season: teamSeason },
            OR: [
              loanUserIds.length > 0 ? { userId: { in: loanUserIds } } : null,
              loanChildIds.length > 0 ? { childId: { in: loanChildIds } } : null,
            ].filter((x): x is NonNullable<typeof x> => x !== null),
          },
          select: { userId: true, childId: true, team: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const loanTeamByUser = new Map<string, string>();
  const loanTeamByChild = new Map<string, string>();
  for (const m of loanMemberships) {
    if (m.userId && !loanTeamByUser.has(m.userId)) loanTeamByUser.set(m.userId, m.team.name);
    if (m.childId && !loanTeamByChild.has(m.childId)) loanTeamByChild.set(m.childId, m.team.name);
  }

  const loanStatRows = [
    ...loanUsers.map((u) => ({
      candidate: {
        kind: "user" as const,
        id: u.id,
        name: u.name ?? "—",
        image: u.image,
        sportRole: u.sportRole,
        sportRoleVariant: u.sportRoleVariant,
        isCaptain: false,
        teamIds: [] as string[],
        ratingMu: u.ratingMu,
        gender: u.gender,
        height: u.height,
      },
      presences: 0,
      absences: 0,
      eligibleSessions: 0,
      seasonCallups: 0,
      daysSinceLastCallup: null,
      availability: availByUserId.get(u.id) ?? null,
      loanFrom: loanTeamByUser.get(u.id) ?? "Prestito",
    })),
    ...loanChildren.map((c) => ({
      candidate: {
        kind: "child" as const,
        id: c.id,
        name: c.name,
        image: null,
        sportRole: c.sportRole,
        sportRoleVariant: c.sportRoleVariant,
        isCaptain: false,
        teamIds: [] as string[],
        ratingMu: c.ratingMu,
        gender: c.gender,
        height: c.height,
      },
      presences: 0,
      absences: 0,
      eligibleSessions: 0,
      seasonCallups: 0,
      daysSinceLastCallup: null,
      availability: availByChildId.get(c.id) ?? null,
      loanFrom: loanTeamByChild.get(c.id) ?? "Prestito",
    })),
  ];

  return {
    id: teamId,
    name: teamName,
    color: teamColor,
    season: teamSeason,
    stats: [
      ...stats.map((s) => ({
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
        loanFrom: null as string | null,
      })),
      ...loanStatRows,
    ],
    initialSelectedUserIds: existingCallups.map((c) => c.userId).filter((id): id is string => !!id),
    initialSelectedChildIds: existingCallups
      .map((c) => c.childId)
      .filter((id): id is string => !!id),
  };
}

export const WINDOW_DAYS_FOR_PRESENCES = WINDOW_DAYS;

/**
 * Costruisce il pool di giocatori "prestabili": membri di altre squadre
 * agonistiche della stessa stagione, esclusi i giocatori già tesserati nelle
 * squadre che partecipano alla partita (`excludeTeamIds`).
 */
export async function buildLoanPool(
  season: string,
  excludeTeamIds: string[]
): Promise<LoanCandidate[]> {
  const memberships = await prisma.teamMembership.findMany({
    where: {
      team: { season, id: { notIn: excludeTeamIds } },
    },
    select: {
      isCaptain: true,
      team: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          sportRole: true,
          sportRoleVariant: true,
          ratingMu: true,
          gender: true,
          height: true,
        },
      },
      child: {
        select: {
          id: true,
          name: true,
          sportRole: true,
          sportRoleVariant: true,
          ratingMu: true,
          gender: true,
          height: true,
        },
      },
    },
  });

  // Esclude chi è già tesserato in una squadra partecipante (potrebbe militare
  // sia in una squadra esclusa sia in un'altra). Dedup per giocatore: prima
  // provenienza incontrata.
  const excludeSet = new Set(excludeTeamIds);
  const participantMembers = await prisma.teamMembership.findMany({
    where: { teamId: { in: excludeTeamIds } },
    select: { userId: true, childId: true },
  });
  const participantUserIds = new Set(
    participantMembers.map((m) => m.userId).filter((x): x is string => !!x)
  );
  const participantChildIds = new Set(
    participantMembers.map((m) => m.childId).filter((x): x is string => !!x)
  );

  const seenUserIds = new Set<string>();
  const seenChildIds = new Set<string>();
  const pool: LoanCandidate[] = [];

  for (const m of memberships) {
    if (m.user) {
      if (participantUserIds.has(m.user.id) || seenUserIds.has(m.user.id)) continue;
      seenUserIds.add(m.user.id);
      pool.push({
        teamName: m.team.name,
        candidate: {
          kind: "user",
          id: m.user.id,
          name: m.user.name ?? "—",
          image: m.user.image,
          sportRole: m.user.sportRole,
          sportRoleVariant: m.user.sportRoleVariant,
          isCaptain: false,
          teamIds: [m.team.id],
          ratingMu: m.user.ratingMu,
          gender: m.user.gender,
          height: m.user.height,
        },
      });
    } else if (m.child) {
      if (participantChildIds.has(m.child.id) || seenChildIds.has(m.child.id)) continue;
      seenChildIds.add(m.child.id);
      pool.push({
        teamName: m.team.name,
        candidate: {
          kind: "child",
          id: m.child.id,
          name: m.child.name,
          image: null,
          sportRole: m.child.sportRole,
          sportRoleVariant: m.child.sportRoleVariant,
          isCaptain: false,
          teamIds: [m.team.id],
          ratingMu: m.child.ratingMu,
          gender: m.child.gender,
          height: m.child.height,
        },
      });
    }
  }

  pool.sort(
    (a, b) =>
      (a.candidate.sportRole ?? 99) - (b.candidate.sportRole ?? 99) ||
      a.candidate.name.localeCompare(b.candidate.name)
  );
  return pool;
}
