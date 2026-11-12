import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { staffGuard } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { announceAlbum } from "@/lib/gallery/albumNotify";
import { outsideCooldown, RENOTIFY_TOO_SOON } from "@/lib/notifications/announce";
import { canNotifyAlbum } from "@/lib/notifications/renotifyRules";

type Params = { params: Promise<{ id: string }> };

// POST — "Avvisa le famiglie…" / "Avvisa di nuovo…" per un album recente (staff, UX-57)
export async function POST(_req: Request, { params }: Params) {
  const denied = await staffGuard();
  if (denied) return denied;
  const { id } = await params;

  try {
    const album = await prisma.photoAlbum.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        date: true,
        photoCount: true,
        unreachableAt: true,
        lastNotifiedAt: true,
      },
    });
    if (!album) return NextResponse.json({ error: "Album non trovato" }, { status: 404 });

    const now = new Date();
    if (!canNotifyAlbum(album, now.getTime())) {
      return NextResponse.json(
        { error: "Si avvisa solo per un album sul sito con data dell'ultimo mese" },
        { status: 400 }
      );
    }

    // La condizione sta nella scrittura: di due richieste insieme ne passa una.
    const claimed = await prisma.photoAlbum.updateMany({
      where: { id, ...outsideCooldown(now) },
      data: { lastNotifiedAt: now },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: RENOTIFY_TOO_SOON }, { status: 409 });
    }

    const kind = album.lastNotifiedAt ? "reminder" : "new";
    inBackground(announceAlbum(album, kind), "notification album (manual)");

    const session = await auth();
    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "SEND_NOTIFICATION",
          targetType: "PhotoAlbum",
          targetId: id,
          after: { title: album.title, kind, audience: "members" },
        }),
        "audit notify album"
      );
    }

    return NextResponse.json({ lastNotifiedAt: now.toISOString() });
  } catch (err) {
    console.error("[albums] notify", err);
    return NextResponse.json({ error: "Avviso non inviato. Riprova." }, { status: 500 });
  }
}
