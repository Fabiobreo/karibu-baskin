import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const callups = await prisma.matchCallup.findMany({
    where: { matchId },
    include: {
      user: { select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true, slug: true } },
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
    },
  });
  return NextResponse.json(callups);
}

// PUT — sostituisce i convocati per la partita (batch)
// Body: { userIds: string[], childIds: string[] }
export async function PUT(req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const body = await req.json().catch(() => ({})) as { userIds?: string[]; childIds?: string[] };
  const userIds = body.userIds ?? [];
  const childIds = body.childIds ?? [];

  // Verifica che la partita esista
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

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

  return NextResponse.json({ ok: true, total: userIds.length + childIds.length });
}
