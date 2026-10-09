import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { announceEvent, outsideCooldown, RENOTIFY_TOO_SOON } from "@/lib/notifications/announce";

type Params = { params: Promise<{ eventId: string }> };

// POST — "Avvisa tutti" / "Avvisa di nuovo" per un evento in programma (staff)
export async function POST(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { eventId } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
        title: true,
        date: true,
        endDate: true,
        lastNotifiedAt: true,
      },
    });
    if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

    const now = new Date();
    if ((event.endDate ?? event.date) < now) {
      return NextResponse.json({ error: "L'evento è già passato" }, { status: 400 });
    }

    // La condizione sta nella scrittura: di due richieste insieme ne passa una.
    const claimed = await prisma.event.updateMany({
      where: { id: eventId, ...outsideCooldown(now) },
      data: { lastNotifiedAt: now },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: RENOTIFY_TOO_SOON }, { status: 409 });
    }

    const kind = event.lastNotifiedAt ? "reminder" : "new";
    inBackground(announceEvent(event, kind), "notification event (manual)");

    const session = await auth();
    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "SEND_NOTIFICATION",
          targetType: "Event",
          targetId: eventId,
          after: { title: event.title, kind, audience: "all" },
        }),
        "audit notify event"
      );
    }

    return NextResponse.json({ lastNotifiedAt: now.toISOString() });
  } catch (err) {
    console.error("[events] notify", err);
    return NextResponse.json({ error: "Avviso non inviato. Riprova." }, { status: 500 });
  }
}
