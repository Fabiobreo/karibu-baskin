import { cache } from "react";
import { prisma } from "@/lib/db";

/** Oltre questa soglia un allenamento non è "il prossimo" (come in HomeSessions). */
const NEXT_SESSION_WINDOW_DAYS = 45;

export type OnboardingStepId = "account" | "role" | "training" | "approval";
export type OnboardingStepStatus = "done" | "todo" | "waiting";

export interface OnboardingStep {
  id: OnboardingStepId;
  status: OnboardingStepStatus;
}

export interface OnboardingSession {
  id: string;
  href: string;
  date: Date;
}

export interface GuestOnboarding {
  steps: OnboardingStep[];
  /** Quanti passi sono fatti, sul totale: alimenta la barra di avanzamento. */
  doneCount: number;
  role: { role: number; variant: string | null } | null;
  /** true se il ruolo è confermato dallo staff, false se è solo suggerito. */
  roleConfirmed: boolean;
  /** Il prossimo allenamento a cui l'utente è già iscritto. */
  registeredSession: OnboardingSession | null;
  /** Il prossimo allenamento con iscrizioni aperte a cui può iscriversi. */
  nextSession: OnboardingSession | null;
}

/**
 * I passi di chi aspetta la conferma dello staff. L'account è fatto per
 * definizione; la conferma resta "in attesa" finché l'utente è GUEST (poi la
 * home diventa quella dei tesserati e la card sparisce). Il primo passo già
 * spuntato è voluto: un percorso avviato si completa più volentieri.
 */
export function computeOnboardingSteps(input: {
  hasRole: boolean;
  hasRegistration: boolean;
}): OnboardingStep[] {
  return [
    { id: "account", status: "done" },
    { id: "role", status: input.hasRole ? "done" : "todo" },
    { id: "training", status: input.hasRegistration ? "done" : "todo" },
    { id: "approval", status: "waiting" },
  ];
}

function sessionHref(s: { id: string; dateSlug: string | null }): string {
  return `/allenamento/${s.dateSlug ?? s.id}`;
}

/**
 * L'allenamento che la card mette in evidenza nel passo "primo allenamento":
 * quello a cui iscriversi, o quello a cui si e' gia' iscritti. La sezione
 * "Prossimi allenamenti" della home non lo ripete (UX-33).
 */
export function onboardingSessionId(data: GuestOnboarding): string | null {
  const training = data.steps.find((s) => s.id === "training");
  return training?.status === "done"
    ? (data.registeredSession?.id ?? null)
    : (data.nextSession?.id ?? null);
}

/**
 * Tutto quello che serve alla card "I tuoi primi passi". Le query partono in
 * parallelo: con Neon a freddo, in fila si sommerebbero. In cache per
 * richiesta: in home la chiedono sia la card sia la sezione degli allenamenti.
 */
export const loadGuestOnboarding = cache(async function loadGuestOnboarding(
  userId: string
): Promise<GuestOnboarding> {
  const now = new Date();
  const horizon = new Date(now.getTime() + NEXT_SESSION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [user, registrationCount, upcomingRegistration, openSessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        sportRole: true,
        sportRoleVariant: true,
        sportRoleSuggested: true,
        sportRoleSuggestedVariant: true,
      },
    }),
    prisma.registration.count({ where: { userId } }),
    prisma.registration.findFirst({
      where: { userId, session: { date: { gt: now } } },
      orderBy: { session: { date: "asc" } },
      select: { session: { select: { id: true, dateSlug: true, date: true } } },
    }),
    prisma.trainingSession.findMany({
      where: { registrationOpen: true, date: { gt: now, lte: horizon } },
      orderBy: { date: "asc" },
      take: 5,
      select: { id: true, dateSlug: true, date: true, allowedRoles: true },
    }),
  ]);

  const role =
    user?.sportRole != null
      ? { role: user.sportRole, variant: user.sportRoleVariant }
      : user?.sportRoleSuggested != null
        ? { role: user.sportRoleSuggested, variant: user.sportRoleSuggestedVariant }
        : null;

  // Un allenamento riservato ad alcuni ruoli si propone solo se il ruolo
  // (anche solo suggerito) è tra quelli: gli altri non potrebbero iscriversi.
  const next = openSessions.find(
    (s) => s.allowedRoles.length === 0 || (role !== null && s.allowedRoles.includes(role.role))
  );

  const steps = computeOnboardingSteps({
    hasRole: role !== null,
    hasRegistration: registrationCount > 0,
  });

  return {
    steps,
    doneCount: steps.filter((s) => s.status === "done").length,
    role,
    roleConfirmed: user?.sportRole != null,
    registeredSession: upcomingRegistration
      ? {
          id: upcomingRegistration.session.id,
          href: sessionHref(upcomingRegistration.session),
          date: upcomingRegistration.session.date,
        }
      : null,
    nextSession: next ? { id: next.id, href: sessionHref(next), date: next.date } : null,
  };
});
