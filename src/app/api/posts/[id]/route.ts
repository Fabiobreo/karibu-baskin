import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { PostUpdateSchema } from "@/lib/schemas/post";
import { announcePost } from "@/lib/notifications/announce";
import { auth } from "@/lib/authjs";
import { sanitizePostHtml } from "@/lib/sanitizeHtml";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { inBackground } from "@/lib/background";
import {
  answerLossConflict,
  lostAnswers,
  planPollOptions,
  type PollOptionsPlan,
} from "@/lib/polls/pollEdit";

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
    include: {
      poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
    },
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

  const { title, body, imageUrl, publish, unpublish, notify, poll, confirmAnswerLoss } =
    parsed.data;

  // I voti stanno attaccati alle opzioni: si aggiornano, non si ricreano, e un
  // voto si cancella solo se chi modifica l'ha confermato.
  let optionsPlan: PollOptionsPlan | null = null;
  if (existing.poll && poll !== undefined) {
    const savedOptions = existing.poll.options;
    const counts = new Map(savedOptions.map((o) => [o.id, o._count.votes]));
    const hasVotes = savedOptions.some((o) => o._count.votes > 0);
    if (poll && hasVotes && poll.multiSelect !== existing.poll.multiSelect) {
      return NextResponse.json(
        { error: "Dopo il primo voto la selezione multipla non si può cambiare" },
        { status: 409 }
      );
    }
    if (poll) optionsPlan = planPollOptions(savedOptions, poll.options);
    const removed = optionsPlan
      ? savedOptions.filter((o) => optionsPlan?.removeIds.includes(o.id))
      : savedOptions;
    const lost = lostAnswers(
      removed.map((o) => ({ id: o.id, label: o.text })),
      counts
    );
    if (lost.length > 0 && !confirmAnswerLoss) {
      return NextResponse.json(answerLossConflict(lost), { status: 409 });
    }
  }

  const wasPublished = !!existing.publishedAt;
  const willPublish = publish && !wasPublished;
  // L'avviso parte solo quando il post esce, e solo con la spunta accesa.
  const willNotify = willPublish && notify;

  // Come nella POST: senza try/catch un errore Prisma esce come 500 con pagina
  // HTML, e il messaggio vero non arriva mai al client.
  let updatedPost;
  try {
    updatedPost = await prisma.$transaction(async (tx) => {
      // Calcola publishedAt
      let publishedAt = existing.publishedAt;
      if (publish && !wasPublished) publishedAt = new Date();
      if (unpublish) publishedAt = null;

      // Gestione poll: crea/aggiorna/elimina. Prima del post, così la risposta
      // contiene il sondaggio com'è dopo il salvataggio.
      if (poll !== undefined) {
        if (poll === null) {
          // Rimuovi poll esistente
          if (existing.poll) {
            await tx.poll.delete({ where: { id: existing.poll.id } });
          }
        } else {
          if (existing.poll && optionsPlan) {
            if (optionsPlan.removeIds.length > 0) {
              await tx.pollOption.deleteMany({
                where: { pollId: existing.poll.id, id: { in: optionsPlan.removeIds } },
              });
            }
            for (const o of optionsPlan.update) {
              await tx.pollOption.update({
                where: { id: o.id },
                data: { text: o.text, order: o.order },
              });
            }
            await tx.poll.update({
              where: { id: existing.poll.id },
              data: {
                question: poll.question,
                multiSelect: poll.multiSelect,
                closesAt: poll.closesAt ? new Date(poll.closesAt) : null,
                options: { create: optionsPlan.create },
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

      return tx.post.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(body ? { body: sanitizePostHtml(body) } : {}),
          ...(imageUrl !== undefined ? { imageUrl: imageUrl ?? null } : {}),
          publishedAt,
          ...(willNotify ? { lastNotifiedAt: publishedAt } : {}),
        },
        include: {
          author: { select: { name: true } },
          poll: { include: { options: { orderBy: { order: "asc" } } } },
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Esiste gia' un post con questo slug" }, { status: 409 });
      }
      return NextResponse.json(
        { error: `Errore del database (${err.code}) durante il salvataggio del post` },
        { status: 400 }
      );
    }
    console.error("[posts] update", err);
    Sentry.captureException(err);
    // Rotta coach/admin: meglio il messaggio vero di un generico errore interno.
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Errore durante il salvataggio del post: ${detail}` },
      { status: 500 }
    );
  }

  // Il sondaggio può essere stato aggiunto o tolto in questo salvataggio: per
  // il testo dell'avviso vale quello che c'è adesso.
  if (willNotify) {
    const currentPoll =
      poll === undefined ? existing.poll : poll && { closesAt: poll.closesAt ?? null };
    inBackground(
      announcePost(
        {
          slug: updatedPost.slug,
          title: updatedPost.title,
          poll: currentPoll
            ? { closesAt: currentPoll.closesAt ? new Date(currentPoll.closesAt) : null }
            : null,
        },
        "new"
      ),
      "notification new post"
    );
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
