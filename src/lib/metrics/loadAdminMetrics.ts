import { prisma } from "@/lib/db";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/sessionPolicy";
import {
  computeMatchMetrics,
  computeTrainingMetrics,
  countActiveUsers,
  ratio,
  type MatchMetrics,
  type TrainingMetrics,
} from "@/lib/metrics/adminMetrics";

/** Finestra delle metriche su allenamenti, partite e sondaggi. */
export const METRICS_WINDOW_DAYS = 90;
/** Finestra per "utenti attivi". */
export const ACTIVE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CommunityMetrics {
  /** Account ATHLETE o superiore. */
  members: number;
  /** Figli gestiti dai genitori (senza account proprio o con account collegato). */
  children: number;
  childrenWithAccount: number;
  activeUsers: number;
  /** Account ancora GUEST: accessi in attesa che lo staff assegni un ruolo. */
  guestsWaiting: number;
  /** Tesserati con almeno un dispositivo iscritto alle notifiche push. */
  pushRate: number | null;
}

export interface EngagementMetrics {
  pollVotes: number;
  pollVoters: number;
  eventResponses: number;
}

export interface AdminMetrics {
  generatedAt: Date;
  community: CommunityMetrics;
  training: TrainingMetrics;
  matches: MatchMetrics;
  engagement: EngagementMetrics;
}

const MEMBER_ROLES = ["ATHLETE", "PARENT", "COACH", "ADMIN"] as const;

export async function loadAdminMetrics(now: Date = new Date()): Promise<AdminMetrics> {
  const since = new Date(now.getTime() - METRICS_WINDOW_DAYS * DAY_MS);

  const [
    members,
    children,
    childrenWithAccount,
    guestsWaiting,
    authSessions,
    pushMembers,
    trainingRows,
    matchRows,
    pollVotes,
    eventResponses,
  ] = await Promise.all([
    prisma.user.count({ where: { appRole: { in: [...MEMBER_ROLES] } } }),
    prisma.child.count(),
    prisma.child.count({ where: { userId: { not: null } } }),
    prisma.user.count({ where: { appRole: "GUEST" } }),
    prisma.session.findMany({
      where: { expires: { gt: now } },
      select: { userId: true, expires: true },
    }),
    prisma.user.count({
      where: { appRole: { in: [...MEMBER_ROLES] }, pushSubscriptions: { some: {} } },
    }),
    prisma.trainingSession.findMany({
      where: { date: { gte: since, lt: now } },
      select: {
        date: true,
        registrationOpenedAt: true,
        managedAt: true,
        registrations: {
          select: {
            createdAt: true,
            attended: true,
            userId: true,
            childId: true,
            registeredAsCoach: true,
          },
        },
      },
    }),
    prisma.match.findMany({
      where: { date: { gte: since, lt: now } },
      select: {
        date: true,
        team: {
          select: { isMixed: true, season: true, _count: { select: { memberships: true } } },
        },
        availabilities: { select: { createdAt: true } },
      },
    }),
    prisma.pollVote.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
    }),
    prisma.eventAttendance.count({ where: { event: { date: { gte: since } } } }),
  ]);

  // La Karibu di stagione non ha rosa: chi può rispondere sono i tesserati di
  // tutte le squadre della sua stagione, contati una volta sola.
  const mixedSeasons = [
    ...new Set(matchRows.filter((m) => m.team.isMixed).map((m) => m.team.season)),
  ];
  const seasonMembers = new Map<string, number>();
  if (mixedSeasons.length > 0) {
    const memberships = await prisma.teamMembership.findMany({
      where: { team: { season: { in: mixedSeasons }, isMixed: false } },
      select: { userId: true, childId: true, team: { select: { season: true } } },
    });
    const seen = new Map<string, Set<string>>();
    for (const m of memberships) {
      const set = seen.get(m.team.season) ?? new Set<string>();
      set.add(m.userId ? `u:${m.userId}` : `c:${m.childId}`);
      seen.set(m.team.season, set);
    }
    for (const [season, set] of seen) seasonMembers.set(season, set.size);
  }

  return {
    generatedAt: now,
    community: {
      members,
      children,
      childrenWithAccount,
      activeUsers: countActiveUsers(authSessions, now, ACTIVE_WINDOW_DAYS, SESSION_MAX_AGE_SECONDS),
      guestsWaiting,
      pushRate: ratio(pushMembers, members),
    },
    training: computeTrainingMetrics(trainingRows),
    matches: computeMatchMetrics(
      matchRows.map((m) => ({
        date: m.date,
        teamMembers: m.team.isMixed
          ? (seasonMembers.get(m.team.season) ?? 0)
          : m.team._count.memberships,
        availabilities: m.availabilities,
      }))
    ),
    engagement: {
      pollVotes: pollVotes.length,
      pollVoters: new Set(pollVotes.map((v) => v.userId)).size,
      eventResponses,
    },
  };
}
