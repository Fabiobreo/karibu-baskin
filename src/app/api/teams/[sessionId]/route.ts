import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateTeams } from "@/lib/teamGenerator";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToAll } from "@/lib/webpush";

// GET — ritorna le squadre salvate in DB
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { teams: true },
  });

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.teams) return NextResponse.json({ teamA: [], teamB: [], generated: false });

  return NextResponse.json({ ...(session.teams as object), generated: true });
}

// POST — genera squadre e le salva in DB (solo admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const numTeams: 2 | 3 = body.numTeams === 3 ? 3 : 2;

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  if (registrations.length === 0) {
    return NextResponse.json({ error: "Nessun atleta iscritto" }, { status: 400 });
  }

  const teams = generateTeams(registrations, sessionId, numTeams);

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { teams: teams as object },
  });

  // Notifica push (fire-and-forget)
  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { title: true },
  });
  if (trainingSession) {
    sendPushToAll({
      title: "📋 Squadre pronte!",
      body: `Le squadre per "${trainingSession.title}" sono state generate.`,
      url: `/allenamento/${sessionId}`,
    }).catch(() => {});
  }

  return NextResponse.json({ ...teams, generated: true });
}

// DELETE — rimuove le squadre salvate (solo admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { teams: Prisma.DbNull },
  });

  return NextResponse.json({ ok: true });
}
