import { NextRequest, NextResponse } from "next/server";
import type { AppRole } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/authRoles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { sendPushToUser } from "@/lib/notifications/webpush";
import { inBackground } from "@/lib/background";
import { LinkRequestCreateSchema } from "@/lib/schemas";

/** Filtro Prisma: richieste senza scadenza o non ancora scadute. */
const NOT_EXPIRED = () => ({ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });

// GET /api/link-requests — richieste di collegamento in attesa per l'utente loggato
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const now = new Date();
  const requests = await prisma.linkRequest.findMany({
    where: {
      targetUserId: session.user.id,
      status: "PENDING",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      // null quando la richiesta non porta una scheda figlio: nasce all'accettazione.
      child: {
        select: {
          id: true,
          name: true,
          sportRole: true,
          sportRoleVariant: true,
          gender: true,
          birthDate: true,
        },
      },
      parent: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

// POST /api/link-requests — un genitore chiede a un figlio che ha già un
// account di confermare il legame.
//
// Qui non nasce nessuna scheda figlio: la crea l'accettazione
// (`/respond`), legata all'account. Prima la scheda veniva creata subito, in una
// chiamata separata, e restava come doppione "senza account" finché il figlio
// non accettava, e per sempre se rifiutava o se la seconda chiamata falliva.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  // Stesso requisito della ricerca dei profili (`/api/users/lookup`).
  const role = session.user.appRole as AppRole | undefined;
  if (!role || !hasRole(role, "PARENT")) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const parentId = session.user.id;

  const rl = checkRateLimit(getClientIp(req), "link-request", 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche momento." },
      { status: 429 }
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = LinkRequestCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { targetUserId } = parsed.data;
  if (targetUserId === parentId) {
    return NextResponse.json(
      { error: "Genitore e figlio devono essere due persone diverse" },
      { status: 400 }
    );
  }

  try {
    const [target, parent, existing, pendingCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          name: true,
          childAccount: {
            select: { guardians: { where: { userId: parentId }, select: { userId: true } } },
          },
        },
      }),
      prisma.user.findUnique({ where: { id: parentId }, select: { name: true } }),
      // Solo le richieste ancora valide: una scaduta resta PENDING nel database
      // finché il cron non la toglie, ma il figlio non la vede più. Trattarla
      // come "già inviata" impedirebbe al genitore di riprovare per mesi.
      prisma.linkRequest.findFirst({
        where: { parentId, targetUserId, status: "PENDING", ...NOT_EXPIRED() },
        select: { id: true },
      }),
      prisma.linkRequest.count({ where: { parentId, status: "PENDING", ...NOT_EXPIRED() } }),
    ]);
    if (!target) {
      return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
    }
    if (target.childAccount) {
      // Ha già una scheda figlio: un'altra sarebbe un doppione. Il secondo
      // genitore lo collega lo staff.
      const mine = target.childAccount.guardians.length > 0;
      return NextResponse.json(
        {
          error: mine
            ? "Questo profilo è già tra i tuoi figli"
            : "Questo profilo è già collegato a un altro genitore: chiedi allo staff di aggiungere anche te",
        },
        { status: 409 }
      );
    }
    if (existing) {
      return NextResponse.json({ requestId: existing.id, name: target.name });
    }
    if (pendingCount >= 5) {
      return NextResponse.json(
        {
          error: "Hai troppe richieste in attesa. Attendi una risposta prima di inviarne di nuove.",
        },
        { status: 429 }
      );
    }

    // Come nella PATCH del figlio: niente nomi scelti dal genitore nelle notifiche.
    const title = `${parent?.name ?? "Un genitore"} vuole collegarsi a te`;
    const linkRequest = await prisma.$transaction(async (tx) => {
      const lr = await tx.linkRequest.create({
        data: {
          parentId,
          targetUserId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
        },
        select: { id: true },
      });
      await tx.appNotification.create({
        data: {
          type: "LINK_REQUEST",
          title,
          body: "Hai ricevuto una richiesta di collegamento genitore-figlio. Vai al tuo profilo per rispondere.",
          url: "/profilo#richieste",
          targetUserId,
        },
      });
      return lr;
    });

    inBackground(
      sendPushToUser(targetUserId, {
        title,
        body: "Hai ricevuto una richiesta di collegamento. Vai al tuo profilo per rispondere.",
        url: "/profilo#richieste",
        type: "LINK_REQUEST",
      }),
      "push link request"
    );

    return NextResponse.json({ requestId: linkRequest.id, name: target.name }, { status: 201 });
  } catch (err) {
    console.error("[link-requests]", err);
    return NextResponse.json({ error: "Richiesta non inviata. Riprova." }, { status: 500 });
  }
}
