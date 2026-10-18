import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { RENOTIFY_TOO_SOON } from "@/lib/notifications/announce";
import { RENOTIFY_COOLDOWN_MS, canNotifyCallups } from "@/lib/notifications/renotifyRules";
import { notifyAllCallups } from "@/lib/notifications/matchNotify";

type Params = { params: Promise<{ matchId: string }> };

// POST — "Avvisa i convocati": rimanda l'avviso di convocazione a tutta la lista (staff)
export async function POST(_req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { matchId } = await params;

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, date: true, _count: { select: { callups: true } } },
    });
    if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

    const now = new Date();
    if (!canNotifyCallups(match.date, match._count.callups, now.getTime())) {
      return NextResponse.json(
        {
          error:
            match._count.callups === 0
              ? "Nessun convocato da avvisare"
              : "La partita è già iniziata",
        },
        { status: 400 }
      );
    }

    // La condizione sta nella scrittura: di due richieste insieme ne passa una.
    const claimed = await prisma.match.updateMany({
      where: {
        id: matchId,
        OR: [
          { callupsNotifiedAt: null },
          { callupsNotifiedAt: { lt: new Date(now.getTime() - RENOTIFY_COOLDOWN_MS) } },
        ],
      },
      data: { callupsNotifiedAt: now },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: RENOTIFY_TOO_SOON }, { status: 409 });
    }

    inBackground(notifyAllCallups(matchId), "notification match callups (manual)");

    const session = await auth();
    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "SEND_NOTIFICATION",
          targetType: "Match",
          targetId: matchId,
          after: { kind: "callups", audience: "callups", count: match._count.callups },
        }),
        "audit notify callups"
      );
    }

    return NextResponse.json({
      callupsNotifiedAt: now.toISOString(),
      count: match._count.callups,
    });
  } catch (err) {
    console.error("[matches] notify callups", err);
    return NextResponse.json({ error: "Avviso non inviato. Riprova." }, { status: 500 });
  }
}
