import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { notifySessionOpen } from "@/lib/notifications/sessionNotify";
import { outsideCooldown, RENOTIFY_TOO_SOON } from "@/lib/notifications/announce";
import { hasRestrictions } from "@/lib/registrationRestrictions";

type Params = { params: Promise<{ sessionId: string }> };

// POST — "Avvisa di nuovo" per un allenamento con le iscrizioni aperte (staff).
// Con le iscrizioni chiuse o non ancora aperte l'avviso lo manda già
// "Apri iscrizioni" / "Riapri iscrizioni".
export async function POST(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { sessionId } = await params;

  try {
    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        date: true,
        endTime: true,
        dateSlug: true,
        allowedRoles: true,
        restrictTeamId: true,
        openRoles: true,
        registrationOpen: true,
      },
    });
    if (!session) return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    if (!session.registrationOpen) {
      return NextResponse.json({ error: "Le iscrizioni non sono aperte" }, { status: 400 });
    }

    const now = new Date();
    if (session.date <= now) {
      return NextResponse.json({ error: "L'allenamento è già iniziato" }, { status: 400 });
    }

    // La condizione sta nella scrittura: di due richieste insieme ne passa una.
    const claimed = await prisma.trainingSession.updateMany({
      where: { id: sessionId, ...outsideCooldown(now) },
      data: { lastNotifiedAt: now },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: RENOTIFY_TOO_SOON }, { status: 409 });
    }

    notifySessionOpen(session, "reminder");

    const authSession = await auth();
    if (authSession?.user?.id) {
      inBackground(
        logAudit({
          actorId: authSession.user.id,
          action: "SEND_NOTIFICATION",
          targetType: "TrainingSession",
          targetId: sessionId,
          after: {
            title: session.title,
            kind: "reminder",
            audience: hasRestrictions(session) ? "restricted" : "all",
          },
        }),
        "audit notify session"
      );
    }

    return NextResponse.json({ lastNotifiedAt: now.toISOString() });
  } catch (err) {
    console.error("[sessions] notify", err);
    return NextResponse.json({ error: "Avviso non inviato. Riprova." }, { status: 500 });
  }
}
