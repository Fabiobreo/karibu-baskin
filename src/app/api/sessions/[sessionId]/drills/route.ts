import { NextRequest, NextResponse } from "next/server";
import { Prisma, type AppRole } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { isMember, staffActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { TrainingDrillsSchema } from "@/lib/schemas/drill";
import { auditDrill } from "@/lib/board/drillAdmin";
import { loadTrainingDrills } from "@/lib/board/trainingDrills";

type Ctx = { params: Promise<{ sessionId: string }> };

/**
 * GET — scaletta di un allenamento (UX-72), con il disegno di ogni schema, ai
 * tesserati. I nomi non ci sono: li mette la pagina dalle squadre, che i
 * tesserati ricevono gia'. Allo staff anche gli schemi tornati in bozza.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const rl = checkRateLimit(getClientIp(req), "get-training-drills", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  if (!(await isMember())) {
    return NextResponse.json({ error: "Solo per i tesserati" }, { status: 403 });
  }
  const { sessionId } = await params;
  const session = await auth();
  const role = session?.user?.appRole as AppRole | undefined;
  const staff = !!role && hasRole(role, "COACH");
  return NextResponse.json(await loadTrainingDrills(sessionId, staff));
}

/**
 * PUT — la scaletta intera, nell'ordine dato (sostituzione in blocco). Staff.
 * Entra solo uno schema pubblicato; uno gia' in scaletta resta anche se nel
 * frattempo e' tornato in bozza o archiviato.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const who = await staffActor();
  if ("error" in who) return who.error;
  const { sessionId } = await params;

  const parsed = TrainingDrillsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const list = parsed.data;

  try {
    const [training, current, drills] = await Promise.all([
      prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { id: true } }),
      prisma.trainingDrill.findMany({ where: { sessionId }, select: { drillId: true } }),
      prisma.drill.findMany({
        where: { id: { in: list.map((d) => d.drillId) } },
        select: { id: true, title: true, status: true, archivedAt: true },
      }),
    ]);
    if (!training) return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });

    const already = new Set(current.map((d) => d.drillId));
    const byId = new Map(drills.map((d) => [d.id, d]));
    for (const item of list) {
      const drill = byId.get(item.drillId);
      if (!drill) return NextResponse.json({ error: "Schema non trovato" }, { status: 400 });
      const usable = drill.status === "PUBLISHED" && !drill.archivedAt;
      if (!usable && !already.has(drill.id)) {
        return NextResponse.json(
          { error: `"${drill.title}" non è pubblicato: pubblicalo dal Playbook` },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction([
      prisma.trainingDrill.deleteMany({ where: { sessionId } }),
      prisma.trainingDrill.createMany({
        data: list.map((item, position) => ({
          sessionId,
          drillId: item.drillId,
          position,
          note: item.note,
          assignments: item.assignments ?? Prisma.DbNull,
        })),
      }),
    ]);

    auditDrill({
      actorId: who.actorId,
      action: "SET_TRAINING_DRILLS",
      targetType: "TrainingSession",
      targetId: sessionId,
      before: { drills: [...already] },
      after: { drills: list.map((d) => byId.get(d.drillId)?.title ?? d.drillId) },
    });
    return NextResponse.json(await loadTrainingDrills(sessionId, true));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: "Schema o allenamento non trovato" }, { status: 400 });
    }
    console.error("[playbook] scaletta", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
