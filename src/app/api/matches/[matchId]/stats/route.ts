import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { PlayerStatsBatchSchema } from "@/lib/schemas";
import { sendPushToAll } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const stats = await prisma.playerMatchStats.findMany({
    where: { matchId },
    include: {
      user: {
        select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true },
      },
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
    },
  });
  return NextResponse.json(stats);
}

// Upsert batch: riceve array di stats per la partita
export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
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

  const saved = results.filter(Boolean);

  if (authSession?.user?.id && saved.length > 0) {
    logAudit({
      actorId: authSession.user.id,
      action: "UPDATE_MATCH_STATS",
      targetType: "Match",
      targetId: matchId,
      after: { rowCount: saved.length },
    }).catch((err) => console.error("[audit] update match stats", err));
  }

  // Notifica push + in-app fire-and-forget agli atleti con stats
  if (saved.length > 0) {
    prisma.match
      .findUnique({
        where: { id: matchId },
        select: {
          team: { select: { name: true } },
          opponent: { select: { name: true } },
          slug: true,
        },
      })
      .then((match) => {
        if (!match) return;
        const title = "Statistiche disponibili";
        const body = `Le tue statistiche per ${match.team.name} vs ${match.opponent.name} sono online.`;
        const url = `/partite/${match.slug ?? matchId}`;
        sendPushToAll({ title, body, url, type: "MATCH_RESULT" }, false).catch(console.error);
        createAppNotification({
          title,
          body,
          url,
          type: "MATCH_RESULT",
        }).catch(console.error);
      })
      .catch(console.error);
  }

  return NextResponse.json(saved);
}
