import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToUser } from "@/lib/notifications/webpush";
import { ChildPatchSchema } from "@/lib/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generateChildSlug } from "@/lib/slugUtils";
import { recomputeRatings } from "@/lib/rating/ratingEngine";

// PATCH /api/children/[childId] — aggiorna i dati di un figlio
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) {
    return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
  }

  const isStaff = await isCoachOrAdmin();
  if (child.parentId !== session.user.id && !isStaff) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // Fix: gender accettava qualsiasi stringa; linkEmail ora validata come email
  const body = await req.json().catch(() => ({}));
  const parsed = ChildPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const {
    name,
    sportRole,
    sportRoleVariant,
    gender,
    birthDate,
    athleteStatus,
    linkEmail,
    linkUserId,
    unlinkAccount,
  } = parsed.data;

  // ── Invia richiesta di collegamento (via email o userId) ──────────────────
  if (linkEmail !== undefined || linkUserId !== undefined) {
    // Rate limit: max 5 richieste di collegamento al minuto per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, "link-request", 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Troppe richieste. Riprova tra qualche momento." },
        { status: 429 }
      );
    }

    // Cap: max 5 richieste pendenti totali per genitore
    const pendingCount = await prisma.linkRequest.count({
      where: { parentId: session.user.id, status: "PENDING" },
    });
    if (pendingCount >= 5) {
      return NextResponse.json(
        {
          error: "Hai troppe richieste in attesa. Attendi una risposta prima di inviarne di nuove.",
        },
        { status: 429 }
      );
    }

    let targetUser: { id: string; name: string | null; email: string } | null = null;

    if (linkUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: linkUserId },
        select: { id: true, name: true, email: true },
      });
    } else if (linkEmail) {
      const trimmedEmail = linkEmail.trim().toLowerCase();
      if (!trimmedEmail) {
        return NextResponse.json({ error: "Email non valida" }, { status: 400 });
      }
      targetUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
        select: { id: true, name: true, email: true },
      });
    }

    if (!targetUser) {
      // Risposta generica: non rivela se l'email è registrata o meno
      return NextResponse.json({ pending: false });
    }

    // Verifica che quell'account non sia già collegato a un altro Child
    const alreadyLinked = await prisma.child.findUnique({ where: { userId: targetUser.id } });
    if (alreadyLinked && alreadyLinked.id !== childId) {
      return NextResponse.json(
        { error: "Questo account è già collegato a un altro figlio" },
        { status: 409 }
      );
    }

    // Se già collegato a questo stesso child, restituisci il child aggiornato
    if (alreadyLinked?.id === childId) {
      return NextResponse.json(child);
    }

    // Richiesta già pendente?
    const existingRequest = await prisma.linkRequest.findFirst({
      where: { childId, targetUserId: targetUser.id, status: "PENDING" },
    });
    if (existingRequest) {
      return NextResponse.json({ pending: true, requestId: existingRequest.id });
    }

    const parent = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    // Crea link request + notifica in modo atomico per evitare richieste orfane.
    // child.name NON viene incluso nelle notifiche push per evitare che un genitore
    // malintenzionato usi il nome del figlio come vettore di phishing (es. link malevoli).
    const parentDisplayName = parent?.name ?? "Un genitore";
    const linkRequest = await prisma.$transaction(async (tx) => {
      const lr = await tx.linkRequest.create({
        data: {
          childId,
          parentId: session.user.id,
          targetUserId: targetUser.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
        },
      });
      await tx.appNotification.create({
        data: {
          type: "LINK_REQUEST",
          title: `${parentDisplayName} vuole collegarsi a te`,
          body: "Hai ricevuto una richiesta di collegamento genitore-figlio. Vai al tuo profilo per rispondere.",
          url: "/profilo#richieste",
          targetUserId: targetUser.id,
        },
      });
      return lr;
    });

    // Push al destinatario (fuori dalla transaction)
    await sendPushToUser(targetUser.id, {
      title: `${parentDisplayName} vuole collegarsi a te`,
      body: "Hai ricevuto una richiesta di collegamento. Vai al tuo profilo per rispondere.",
      url: "/profilo#richieste",
      type: "LINK_REQUEST",
    });

    return NextResponse.json({ pending: true, requestId: linkRequest.id });
  }

  // ── Scollega account ──────────────────────────────────────────────────────
  if (unlinkAccount) {
    const childBefore = await prisma.child.findUnique({
      where: { id: childId },
      select: { userId: true, name: true },
    });
    const updated = await prisma.child.update({
      where: { id: childId },
      data: { userId: null },
    });
    // Notifica l'utente scollegato
    if (childBefore?.userId) {
      prisma.appNotification
        .create({
          data: {
            type: "SYSTEM",
            title: "Collegamento rimosso",
            body: `Il collegamento con il profilo "${childBefore.name}" è stato rimosso dal genitore.`,
            url: "/profilo",
            targetUserId: childBefore.userId,
          },
        })
        .catch(() => {});
    }
    return NextResponse.json(updated);
  }

  // ── Aggiornamento dati base ───────────────────────────────────────────────
  const trimmedName = name?.trim().slice(0, 60);
  if (trimmedName !== undefined && !trimmedName) {
    return NextResponse.json({ error: "Il nome non può essere vuoto" }, { status: 400 });
  }

  // Genera lo slug pubblico: alla prima impostazione, o quando il nome cambia.
  let slugToSet: string | undefined;
  if ((trimmedName !== undefined && trimmedName !== child.name) || !child.slug) {
    const generated = await generateChildSlug(trimmedName ?? child.name);
    if (generated) slugToSet = generated;
  }

  // Cambio di CATEGORIA: registra lo storico e segna se serve rigonfiare σ.
  const roleChangedToNew =
    sportRole !== undefined && sportRole !== null && sportRole !== child.sportRole;
  const isCategoryChange = roleChangedToNew && child.sportRole !== null;

  const updated = await prisma.child.update({
    where: { id: childId },
    data: {
      ...(trimmedName !== undefined && { name: trimmedName }),
      ...(slugToSet !== undefined && { slug: slugToSet }),
      ...(sportRole !== undefined && { sportRole: sportRole ?? null }),
      ...(sportRoleVariant !== undefined && { sportRoleVariant: sportRoleVariant ?? null }),
      ...(gender !== undefined && { gender: gender ?? null }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      // Stato atleta: modificabile solo dallo staff
      ...(athleteStatus !== undefined && isStaff && { athleteStatus: athleteStatus ?? null }),
    },
  });

  if (roleChangedToNew) {
    await prisma.sportRoleHistory.create({ data: { childId, sportRole: sportRole! } });
    // Cambio categoria (non prima assegnazione) → rigonfia σ del rating TrueSkill.
    if (isCategoryChange) {
      recomputeRatings(prisma).catch((err) =>
        console.error("[rating] child role change recompute", err)
      );
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/children/[childId] — elimina un figlio
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) {
    return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
  }

  const isStaff = await isCoachOrAdmin();
  if (child.parentId !== session.user.id && !isStaff) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // Trova le sessioni con squadre generate che includono questo figlio,
  // poi elimina iscrizioni e azzera squadre in modo atomico (evita riferimenti fantasma)
  const childRegs = await prisma.registration.findMany({
    where: { childId },
    select: { sessionId: true },
  });
  if (childRegs.length > 0) {
    const sessionIds = [...new Set(childRegs.map((r) => r.sessionId))];
    await prisma.$transaction([
      prisma.registration.deleteMany({ where: { childId } }),
      prisma.trainingSession.updateMany({
        where: { id: { in: sessionIds } },
        data: { teams: Prisma.DbNull },
      }),
    ]);
  }

  await prisma.child.delete({ where: { id: childId } });
  return new NextResponse(null, { status: 204 });
}
