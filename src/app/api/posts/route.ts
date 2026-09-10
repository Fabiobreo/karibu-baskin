import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { PostCreateSchema } from "@/lib/schemas/post";
import { generatePostSlug } from "@/lib/slugUtils";
import { sendPushToAll } from "@/lib/notifications/webpush";
import { createAppNotification } from "@/lib/notifications/appNotifications";
import { auth } from "@/lib/authjs";
import DOMPurify from "isomorphic-dompurify";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";

// GET — lista post pubblicati (pubblica)
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "get-posts", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
      publishedAt: true,
      createdAt: true,
      author: { select: { name: true } },
      poll: { select: { id: true, question: true, closesAt: true, multiSelect: true } },
    },
  });

  return NextResponse.json(posts);
}

// POST — crea nuovo post (coach+)
export async function POST(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const session = await auth();
  const authorId = session?.user?.id;
  if (!authorId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = PostCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { title, body, imageUrl, publish, poll } = parsed.data;
  const publishedAt = publish ? new Date() : null;

  // Tutto dentro il try: anche la sanitizzazione (che carica jsdom) e la
  // generazione dello slug (che interroga il DB) possono esplodere, e fuori dal
  // try diventavano un 500 con pagina HTML illeggibile per il client.
  let post;
  let slug: string;
  try {
    const sanitizedBody = DOMPurify.sanitize(body);
    slug = await generatePostSlug(title);
    post = await prisma.post.create({
      data: {
        slug,
        title,
        body: sanitizedBody,
        imageUrl: imageUrl ?? null,
        authorId,
        publishedAt,
        ...(poll
          ? {
              poll: {
                create: {
                  question: poll.question,
                  multiSelect: poll.multiSelect,
                  closesAt: poll.closesAt ? new Date(poll.closesAt) : null,
                  options: {
                    create: poll.options.map((o) => ({ text: o.text, order: o.order })),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { name: true } },
        poll: { include: { options: { orderBy: { order: "asc" } } } },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Esiste gia' un post con questo slug" }, { status: 409 });
      }
      return NextResponse.json(
        { error: `Errore del database (${err.code}) durante la creazione del post` },
        { status: 400 }
      );
    }
    console.error("[posts] create", err);
    Sentry.captureException(err);
    // Rotta riservata a coach/admin: il messaggio vero vale piu' di un generico
    // "errore interno", altrimenti in produzione resta solo la pagina HTML 500.
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Errore durante la creazione del post: ${detail}` },
      { status: 500 }
    );
  }

  if (publish && publishedAt) {
    const notifType = poll ? "NEW_POLL" : "NEW_POST";
    const notifTitle = poll ? "Nuovo sondaggio" : "Nuova news";
    const notifBody = title;

    sendPushToAll(
      { title: notifTitle, body: notifBody, url: `/news/${slug}`, type: notifType },
      false,
      "NEW_POST"
    ).catch(console.error);

    createAppNotification({
      type: notifType,
      title: notifTitle,
      body: notifBody,
      url: `/news/${slug}`,
    }).catch(console.error);
  }

  return NextResponse.json(post, { status: 201 });
}
