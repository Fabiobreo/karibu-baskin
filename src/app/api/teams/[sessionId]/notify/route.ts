import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { inBackground } from "@/lib/background";
import { notifyTeamChanges } from "@/lib/notifications/teamsNotify";
import { TeamsNotifySchema } from "@/lib/schemas/teams";
import { Prisma } from "@prisma/client";
import { NOTIFIED_KEY, assignmentOf, notifiedAssignmentOf, teamChanges } from "@/lib/trainingTeams";

/**
 * POST — avvisa chi è entrato o ha cambiato squadra durante una modifica a
 * mano (UX-54). L'editor salva a ogni spostamento: avvisare lì manderebbe due
 * avvisi a chi viene spostato due volte. Su "Fatto" si confrontano le
 * squadre salvate con l'ultimo avviso, che il server tiene nelle squadre
 * (`NOTIFIED_KEY`) e aggiorna qui: una seconda chiamata, o una seconda scheda,
 * non trova più niente da avvisare. L'assegnazione mandata dall'editor serve
 * solo per le squadre salvate prima che il server la tenesse.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const parsed = TeamsNotifySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const [session, registrations] = await Promise.all([
    prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { teams: true } }),
    prisma.registration.findMany({
      where: { sessionId, registeredAsCoach: false },
      select: { id: true, userId: true, childId: true },
    }),
  ]);
  if (!session) return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });

  const current = assignmentOf(session.teams as Parameters<typeof assignmentOf>[0]);
  const changes = teamChanges(notifiedAssignmentOf(session.teams) ?? parsed.data.before, current);
  if (changes.added.length === 0 && changes.moved.length === 0) {
    return NextResponse.json({ added: 0, moved: 0 });
  }
  try {
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { teams: { ...(session.teams as object), [NOTIFIED_KEY]: current } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    }
    throw err;
  }
  inBackground(notifyTeamChanges(sessionId, changes, registrations), "notification team edit");

  return NextResponse.json({ added: changes.added.length, moved: changes.moved.length });
}
