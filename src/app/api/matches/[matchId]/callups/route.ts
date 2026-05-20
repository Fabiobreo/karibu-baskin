import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { CallupsSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const callups = await prisma.matchCallup.findMany({
    where: { matchId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          sportRole: true,
          sportRoleVariant: true,
          slug: true,
        },
      },
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
    },
  });
  return NextResponse.json(callups);
}

// PUT — sostituisce i convocati per la partita (batch)
// Body: { userIds: string[], childIds: string[] }
export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = CallupsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
  const { userIds, childIds } = parsed.data;

  // Verifica che la partita esista
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  const before = await prisma.matchCallup.findMany({
    where: { matchId },
    select: { userId: true, childId: true },
  });

  // Sostituisci i convocati
  await prisma.$transaction([
    prisma.matchCallup.deleteMany({ where: { matchId } }),
    prisma.matchCallup.createMany({
      data: [
        ...userIds.map((userId) => ({ matchId, userId })),
        ...childIds.map((childId) => ({ matchId, childId })),
      ],
      skipDuplicates: true,
    }),
  ]);

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "UPDATE_CALLUPS",
      targetType: "Match",
      targetId: matchId,
      before: {
        userIds: before.map((c) => c.userId).filter(Boolean),
        childIds: before.map((c) => c.childId).filter(Boolean),
      },
      after: { userIds, childIds },
    }).catch((err) => console.error("[audit] update callups", err));
  }

  return NextResponse.json({ ok: true, total: userIds.length + childIds.length });
}
