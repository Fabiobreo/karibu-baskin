import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { computeCandidateStats } from "@/lib/callupStats";
import type {
  CandidateInput,
  SessionEligibilityInput,
  RegistrationLookup,
  CallupLookup,
} from "@/lib/callupStats";
import ConvocazioniClient from "@/components/ConvocazioniClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Convocazioni | Admin" };

type Params = { params: Promise<{ matchId: string }> };

const WINDOW_DAYS = 14;

export default async function ConvocazioniPage({ params }: Params) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }

  const { matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      team: { select: { id: true, name: true, season: true, color: true } },
      opponent: { select: { id: true, name: true } },
    },
  });
  if (!match) notFound();

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [memberships, existingCallups, windowSessions, allUserMemberships, allChildMemberships] =
    await Promise.all([
      // Rosa della squadra
      prisma.teamMembership.findMany({
        where: { teamId: match.teamId },
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
          child: {
            select: { id: true, name: true, sportRole: true, sportRoleVariant: true },
          },
        },
      }),
      // Convocazioni esistenti su questo match
      prisma.matchCallup.findMany({
        where: { matchId },
        select: { userId: true, childId: true },
      }),
      // Allenamenti gestiti nelle ultime 2 settimane
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
      // Tutte le membership degli utenti della rosa (per gestire restrictTeamId)
      // (subquery: prendi userId/childId della rosa, poi cerca tutte le loro membership)
      prisma.teamMembership.findMany({
        where: {
          teamId: match.teamId,
          userId: { not: null },
        },
        select: { userId: true },
      }),
      prisma.teamMembership.findMany({
        where: {
          teamId: match.teamId,
          childId: { not: null },
        },
        select: { childId: true },
      }),
    ]);

  const rosterUserIds = allUserMemberships.map((m) => m.userId!).filter(Boolean);
  const rosterChildIds = allChildMemberships.map((m) => m.childId!).filter(Boolean);

  // Membership totali (tutte le squadre) di chi fa parte di questa rosa
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

  // Costruisci candidati dalla rosa
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
          teamIds: teamIdsByUserId.get(m.userId) ?? [match.teamId],
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
          teamIds: teamIdsByChildId.get(m.childId) ?? [match.teamId],
        };
      }
      return null;
    })
    .filter((c): c is CandidateInput => c !== null)
    .sort((a, b) => (a.sportRole ?? 99) - (b.sportRole ?? 99) || a.name.localeCompare(b.name));

  const candidateUserIds = candidates.filter((c) => c.kind === "user").map((c) => c.id);
  const candidateChildIds = candidates.filter((c) => c.kind === "child").map((c) => c.id);

  // Registrazioni dei candidati su quelle sessioni
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

  // Convocazioni passate dei candidati nella stagione corrente, escluso questo match
  const seasonCallups =
    candidateUserIds.length > 0 || candidateChildIds.length > 0
      ? await prisma.matchCallup.findMany({
          where: {
            matchId: { not: matchId },
            match: { team: { season: match.team.season } },
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

  const stats = computeCandidateStats({
    candidates,
    windowSessions: windowSessionsInput,
    registrations: regLookup,
    callups: callupLookup,
    referenceDate: now,
  });

  const initialSelectedUserIds = existingCallups
    .map((c) => c.userId)
    .filter((id): id is string => !!id);
  const initialSelectedChildIds = existingCallups
    .map((c) => c.childId)
    .filter((id): id is string => !!id);

  return (
    <ConvocazioniClient
      matchId={matchId}
      matchLabel={`${match.team.name} vs ${match.opponent.name}`}
      matchDateISO={match.date.toISOString()}
      teamSeason={match.team.season}
      windowEligibleSessions={windowSessions.length}
      stats={stats.map((s) => ({
        candidate: s.candidate,
        presences: s.presences,
        absences: s.absences,
        eligibleSessions: s.eligibleSessions,
        seasonCallups: s.seasonCallups,
        daysSinceLastCallup: s.daysSinceLastCallup,
      }))}
      initialSelectedUserIds={initialSelectedUserIds}
      initialSelectedChildIds={initialSelectedChildIds}
    />
  );
}
