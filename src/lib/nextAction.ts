import { prisma } from "@/lib/db";
import { guardianOf } from "@/lib/guardians";
import { countPendingAvailabilities } from "@/lib/matches/myAvailabilities";
import { checkRegistrationAllowed, type SessionRestrictions } from "@/lib/registrationRestrictions";

/**
 * "La tua prossima cosa da fare" per i tesserati (UX-16): una sola azione,
 * scelta in ordine di urgenza. Modello: `@/lib/guestOnboarding`.
 */

/** Oltre questa soglia un allenamento non e' "il prossimo" (come per gli ospiti). */
const WINDOW_DAYS = 45;

export interface ActionSession {
  href: string;
  title: string;
  date: Date;
  endTime: Date | null;
  location: string | null;
}

export type NextAction =
  | { kind: "availability"; count: number }
  | { kind: "register"; session: ActionSession; /** null = per se' */ childName: string | null }
  | {
      kind: "registered";
      session: ActionSession;
      /** chi e' iscritto, oltre a se' */ names: string[];
      self: boolean;
    }
  | { kind: "allSet" };

export interface Subject {
  kind: "self" | "child";
  id: string;
  name: string;
  sportRole: number | null;
  teamIds: string[];
}

export interface OpenSession extends ActionSession, SessionRestrictions {
  /** Id (utente o figlio) gia' iscritti fra i soggetti di questo utente. */
  registeredIds: string[];
}

/** Il soggetto puo' iscriversi a questo allenamento? Stesse regole del form. */
function canRegister(s: OpenSession, subject: Subject, appRole: string): boolean {
  if (subject.sportRole == null) {
    // Senza ruolo il form chiede il questionario: si propone solo se non ci
    // sono restrizioni di ruolo.
    return s.allowedRoles.length === 0;
  }
  const inTeam = s.restrictTeamId !== null && subject.teamIds.includes(s.restrictTeamId);
  // I figli seguono le regole di un atleta.
  const role = subject.kind === "child" ? "ATHLETE" : appRole;
  return checkRegistrationAllowed(s, role, subject.sportRole, inTeam).allowed;
}

export function pickNextAction(input: {
  appRole: string;
  pendingAvailabilities: number;
  subjects: Subject[];
  openSessions: OpenSession[];
  registered: { session: ActionSession; names: string[]; self: boolean } | null;
}): NextAction {
  if (input.pendingAvailabilities > 0) {
    return { kind: "availability", count: input.pendingAvailabilities };
  }
  for (const s of input.openSessions) {
    for (const subject of input.subjects) {
      if (s.registeredIds.includes(subject.id)) continue;
      if (!canRegister(s, subject, input.appRole)) continue;
      const {
        registeredIds: _ids,
        allowedRoles: _a,
        restrictTeamId: _r,
        openRoles: _o,
        ...session
      } = s;
      return {
        kind: "register",
        session,
        childName: subject.kind === "child" ? subject.name : null,
      };
    }
  }
  if (input.registered) return { kind: "registered", ...input.registered };
  return { kind: "allSet" };
}

function href(s: { id: string; dateSlug: string | null }) {
  return `/allenamento/${s.dateSlug ?? s.id}`;
}

/** Tutto quello che serve alla card. Query in parallelo (Neon a freddo). */
export async function loadNextAction(userId: string, appRole: string): Promise<NextAction> {
  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [pending, user, children] = await Promise.all([
    countPendingAvailabilities(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, sportRole: true, teamMemberships: { select: { teamId: true } } },
    }),
    prisma.child.findMany({
      where: guardianOf(userId),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sportRole: true,
        teamMemberships: { select: { teamId: true } },
      },
    }),
  ]);

  const subjects: Subject[] = [];
  // Il genitore che non gioca (senza ruolo) non si propone come atleta.
  if (user && (appRole !== "PARENT" || user.sportRole != null)) {
    subjects.push({
      kind: "self",
      id: userId,
      name: user.name ?? "",
      sportRole: user.sportRole,
      teamIds: user.teamMemberships.map((m) => m.teamId),
    });
  }
  for (const c of children) {
    subjects.push({
      kind: "child",
      id: c.id,
      name: c.name,
      sportRole: c.sportRole,
      teamIds: c.teamMemberships.map((m) => m.teamId),
    });
  }
  const childIds = children.map((c) => c.id);
  const mine = { OR: [{ userId }, ...(childIds.length ? [{ childId: { in: childIds } }] : [])] };

  const sessionSelect = {
    id: true,
    dateSlug: true,
    title: true,
    date: true,
    endTime: true,
    location: true,
  } as const;

  const [open, nextRegistered] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { registrationOpen: true, date: { gt: now, lte: horizon } },
      orderBy: { date: "asc" },
      take: 10,
      select: {
        ...sessionSelect,
        allowedRoles: true,
        restrictTeamId: true,
        openRoles: true,
        registrations: { where: mine, select: { userId: true, childId: true } },
      },
    }),
    prisma.trainingSession.findFirst({
      where: { date: { gt: now }, registrations: { some: mine } },
      orderBy: { date: "asc" },
      select: {
        ...sessionSelect,
        registrations: { where: mine, select: { userId: true, name: true } },
      },
    }),
  ]);

  const toAction = (s: {
    id: string;
    dateSlug: string | null;
    title: string;
    date: Date;
    endTime: Date | null;
    location: string | null;
  }): ActionSession => ({
    href: href(s),
    title: s.title,
    date: s.date,
    endTime: s.endTime,
    location: s.location,
  });

  return pickNextAction({
    appRole,
    pendingAvailabilities: pending,
    subjects,
    openSessions: open.map((s) => ({
      ...toAction(s),
      allowedRoles: s.allowedRoles,
      restrictTeamId: s.restrictTeamId,
      openRoles: s.openRoles,
      registeredIds: s.registrations.map((r) => r.userId ?? r.childId ?? ""),
    })),
    registered: nextRegistered
      ? {
          session: toAction(nextRegistered),
          self: nextRegistered.registrations.some((r) => r.userId === userId),
          names: nextRegistered.registrations.filter((r) => r.userId !== userId).map((r) => r.name),
        }
      : null,
  });
}
