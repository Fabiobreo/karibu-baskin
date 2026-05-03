import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { PlayerStatsBatchSchema } from "@/lib/schemas/match";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const stats = await prisma.playerMatchStats.findMany({
    where: { matchId },
    include: {
      user: { select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true } },
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
    },
  });
  return NextResponse.json(stats);
}

// Upsert batch: riceve array di stats per la partita
export async function PUT(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = PlayerStatsBatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati statistiche non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Upsert ogni riga
  const results = await Promise.all(
    body.map((s) => {
      const data = {
        points: s.points ?? 0,
        baskets: s.baskets ?? 0,
        fouls: s.fouls ?? 0,
        assists: s.assists ?? 0,
        rebounds: s.rebounds ?? 0,
        notes: s.notes?.trim() || null,
      };
      if (s.userId) {
        return prisma.playerMatchStats.upsert({
          where: { matchId_userId: { matchId, userId: s.userId } },
          create: { matchId, userId: s.userId, ...data },
          update: data,
        });
      }
      if (s.childId) {
        return prisma.playerMatchStats.upsert({
          where: { matchId_childId: { matchId, childId: s.childId } },
          create: { matchId, childId: s.childId, ...data },
          update: data,
        });
      }
      return null;
    })
  );

  return NextResponse.json(results.filter(Boolean));
}
