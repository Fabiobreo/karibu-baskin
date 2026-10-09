import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { announcePost, outsideCooldown, RENOTIFY_TOO_SOON } from "@/lib/notifications/announce";
import { canNotifyPost } from "@/lib/notifications/renotifyRules";

type Params = { params: Promise<{ id: string }> };

// POST — "Avvisa tutti" / "Avvisa di nuovo" per un post pubblicato (staff)
export async function POST(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        slug: true,
        title: true,
        publishedAt: true,
        lastNotifiedAt: true,
        poll: { select: { closesAt: true } },
      },
    });
    if (!post) return NextResponse.json({ error: "Post non trovato" }, { status: 404 });
    if (!post.publishedAt) {
      return NextResponse.json({ error: "Il post è ancora una bozza" }, { status: 400 });
    }

    const now = new Date();
    if (!canNotifyPost(post.publishedAt, now.getTime())) {
      return NextResponse.json(
        { error: "Il post è uscito da più di un mese: non si rimanda più" },
        { status: 400 }
      );
    }

    // La condizione sta nella scrittura: di due richieste insieme ne passa una.
    const claimed = await prisma.post.updateMany({
      where: { id, ...outsideCooldown(now) },
      data: { lastNotifiedAt: now },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: RENOTIFY_TOO_SOON }, { status: 409 });
    }

    const kind = post.lastNotifiedAt ? "reminder" : "new";
    inBackground(announcePost(post, kind), "notification post (manual)");

    const session = await auth();
    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "SEND_NOTIFICATION",
          targetType: "Post",
          targetId: id,
          after: { title: post.title, kind, audience: "all" },
        }),
        "audit notify post"
      );
    }

    return NextResponse.json({ lastNotifiedAt: now.toISOString() });
  } catch (err) {
    console.error("[posts] notify", err);
    return NextResponse.json({ error: "Avviso non inviato. Riprova." }, { status: 500 });
  }
}
