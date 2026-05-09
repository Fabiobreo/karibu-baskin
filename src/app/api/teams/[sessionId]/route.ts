import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateTeams } from "@/lib/teamGenerator";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToUsers } from "@/lib/webpush";
import { createTargetedAppNotifications } from "@/lib/appNotifications";

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

// POST — crea squadre e le salva in DB (solo admin)
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
    include: {
      user: { select: { gender: true } },
      child: { select: { gender: true } },
    },
  });

  if (registrations.length === 0) {
    return NextResponse.json({ error: "Nessun atleta iscritto" }, { status: 400 });
  }

  const athletes = registrations
    .filter((r) => !r.registeredAsCoach)
    .map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      gender: r.user?.gender ?? r.child?.gender ?? null,
    }));
  const coaches = registrations
    .filter((r) => r.registeredAsCoach)
    .map((r) => ({ id: r.id, name: r.name }));
  const teams = generateTeams(athletes, sessionId, numTeams);

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { teams: { ...teams, coaches, generated: true } as object },
  });

  // Notifica push solo agli iscritti all'allenamento (fire-and-forget)
  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { title: true, dateSlug: true },
  });
  if (trainingSession) {
    // Raccoglie gli userId degli iscritti come atleti (non allenatori)
    const registeredUserIds = registrations
      .filter((r) => !r.registeredAsCoach && r.userId)
      .map((r) => r.userId as string);

    const pushPayload = {
      title: "📋 Squadre pronte!",
      body: `Le squadre per "${trainingSession.title}" sono state create.`,
      url: `/allenamento/${trainingSession.dateSlug ?? sessionId}`,
      type: "TEAMS_READY",
    };
    sendPushToUsers(registeredUserIds, pushPayload, "TEAMS_READY").catch((err) => console.error("[push] teams ready", err));
    createTargetedAppNotifications(registeredUserIds, {
      type: "TEAMS_READY",
      title: "Squadre pronte!",
      body: `Le squadre per "${trainingSession.title}" sono state create.`,
      url: `/allenamento/${trainingSession.dateSlug ?? sessionId}`,
    }).catch((err) => console.error("[notification] teams ready", err));
  }

  return NextResponse.json({ ...teams, coaches, generated: true });
}

// PUT — aggiorna le squadre (spostamento manuale giocatori, solo staff)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.teamA) || !Array.isArray(body.teamB)) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { teams: { ...body, generated: true } as object },
  });

  return NextResponse.json({ ...body, generated: true });
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

  try {
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { teams: Prisma.DbNull },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
