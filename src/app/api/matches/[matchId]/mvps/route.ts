import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { MvpsSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;
  const mvps = await prisma.matchMvp.findMany({
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
  return NextResponse.json(mvps);
}

// PUT — sostituisce gli MVP della partita (max 3 totali)
// Body: { userIds: string[], childIds: string[] }
export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = MvpsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { userIds, childIds } = parsed.data;

  if (userIds.length + childIds.length > 3) {
    return NextResponse.json({ error: "Massimo 3 MVP per partita" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  // Valida che ogni MVP sia tra i convocati della partita
  if (userIds.length > 0 || childIds.length > 0) {
    const callups = await prisma.matchCallup.findMany({
      where: { matchId },
      select: { userId: true, childId: true },
    });
    const callupUserIds = new Set(callups.map((c) => c.userId).filter((id): id is string => !!id));
    const callupChildIds = new Set(
      callups.map((c) => c.childId).filter((id): id is string => !!id)
    );
    for (const id of userIds) {
      if (!callupUserIds.has(id)) {
        return NextResponse.json(
          { error: "Gli MVP devono essere scelti tra i convocati" },
          { status: 400 }
        );
      }
    }
    for (const id of childIds) {
      if (!callupChildIds.has(id)) {
        return NextResponse.json(
          { error: "Gli MVP devono essere scelti tra i convocati" },
          { status: 400 }
        );
      }
    }
  }

  const before = await prisma.matchMvp.findMany({
    where: { matchId },
    select: { userId: true, childId: true },
  });

  await prisma.$transaction([
    prisma.matchMvp.deleteMany({ where: { matchId } }),
    prisma.matchMvp.createMany({
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
      action: "UPDATE_MVPS",
      targetType: "Match",
      targetId: matchId,
      before: {
        userIds: before.map((c) => c.userId).filter(Boolean),
        childIds: before.map((c) => c.childId).filter(Boolean),
      },
      after: { userIds, childIds },
    }).catch((err) => console.error("[audit] update mvps", err));
  }

  return NextResponse.json({ ok: true, total: userIds.length + childIds.length });
}
