import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { PostUpdateSchema } from "@/lib/schemas/post";
import { sendPushToAll } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";
import { auth } from "@/lib/authjs";
import DOMPurify from "isomorphic-dompurify";

type Params = { params: Promise<{ id: string }> };

// GET — singolo post per slug o id (pubblica)
export async function GET(req: NextRequest, { params }: Params) {
  const rl = checkRateLimit(getClientIp(req), "get-post", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const { id } = await params;
  const isStaff = await isCoachOrAdmin();

  const post = await prisma.post.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      ...(isStaff ? {} : { publishedAt: { not: null } }),
    },
    include: {
      author: { select: { name: true } },
      poll: {
        include: {
          options: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!post) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  // Se il poll è chiuso, includi i conteggi voti
  let voteCounts: Record<string, number> | null = null;
  const now = new Date();
  const pollClosed = post.poll?.closesAt && post.poll.closesAt <= now;
  if (post.poll && pollClosed) {
    const counts = await prisma.pollVote.groupBy({
      by: ["optionId"],
      where: { pollId: post.poll.id },
      _count: { optionId: true },
    });
    voteCounts = Object.fromEntries(counts.map((c) => [c.optionId, c._count.optionId]));
  }

  // Voti dell'utente corrente (sempre visibili a chi è loggato)
  const session = await auth();
  let userVoteOptionIds: string[] = [];
  if (session?.user?.id && post.poll) {
    const votes = await prisma.pollVote.findMany({
      where: { pollId: post.poll.id, userId: session.user.id },
      select: { optionId: true },
    });
    userVoteOptionIds = votes.map((v) => v.optionId);
  }

  return NextResponse.json({ ...post, voteCounts, userVoteOptionIds });
}

// PUT — aggiorna post (coach+)
export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.post.findUnique({
    where: { id },
    include: { poll: true },
  });
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const raw = await req.json().catch(() => null);
  const parsed = PostUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { title, body, publish, unpublish, poll } = parsed.data;
  const wasPublished = !!existing.publishedAt;
  const willPublish = publish && !wasPublished;

  const updatedPost = await prisma.$transaction(async (tx) => {
    // Calcola publishedAt
    let publishedAt = existing.publishedAt;
    if (publish && !wasPublished) publishedAt = new Date();
    if (unpublish) publishedAt = null;

    const updated = await tx.post.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(body ? { body: DOMPurify.sanitize(body) } : {}),
        publishedAt,
      },
      include: {
        author: { select: { name: true } },
        poll: { include: { options: { orderBy: { order: "asc" } } } },
      },
    });

    // Gestione poll: crea/aggiorna/elimina
    if (poll !== undefined) {
      if (poll === null) {
        // Rimuovi poll esistente
        if (existing.poll) {
          await tx.poll.delete({ where: { id: existing.poll.id } });
        }
      } else {
        if (existing.poll) {
          // Aggiorna il poll esistente: cancella le opzioni vecchie e ricrea
          await tx.pollOption.deleteMany({ where: { pollId: existing.poll.id } });
          await tx.poll.update({
            where: { id: existing.poll.id },
            data: {
              question: poll.question,
              multiSelect: poll.multiSelect,
              closesAt: poll.closesAt ? new Date(poll.closesAt) : null,
              options: {
                create: poll.options.map((o) => ({ text: o.text, order: o.order })),
              },
            },
          });
        } else {
          // Crea nuovo poll
          await tx.poll.create({
            data: {
              postId: id,
              question: poll.question,
              multiSelect: poll.multiSelect,
              closesAt: poll.closesAt ? new Date(poll.closesAt) : null,
              options: {
                create: poll.options.map((o) => ({ text: o.text, order: o.order })),
              },
            },
          });
        }
      }
    }

    return updated;
  });

  // Notifiche alla prima pubblicazione
  if (willPublish) {
    const hasPoll = !!updatedPost.poll || !!poll;
    const notifType = hasPoll ? "NEW_POLL" : "NEW_POST";
    const notifTitle = hasPoll ? "Nuovo sondaggio" : "Nuova news";

    sendPushToAll(
      {
        title: notifTitle,
        body: updatedPost.title,
        url: `/news/${updatedPost.slug}`,
        type: notifType,
      },
      false,
      "NEW_POST"
    ).catch(console.error);

    createAppNotification({
      type: notifType,
      title: notifTitle,
      body: updatedPost.title,
      url: `/news/${updatedPost.slug}`,
    }).catch(console.error);
  }

  return NextResponse.json(updatedPost);
}

// DELETE — elimina post (coach+)
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
