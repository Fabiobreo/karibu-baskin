import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToUser } from "@/lib/webpush";

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

  const body = await req.json().catch(() => ({}));
  const { name, sportRole, sportRoleVariant, gender, birthDate, linkEmail, linkUserId, unlinkAccount } = body as {
    name?: string;
    sportRole?: number | null;
    sportRoleVariant?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    linkEmail?: string;    // cerca utente per email e invia richiesta
    linkUserId?: string;   // invia richiesta direttamente per userId noto
    unlinkAccount?: boolean;
  };

  // ── Invia richiesta di collegamento (via email o userId) ──────────────────
  if (linkEmail !== undefined || linkUserId !== undefined) {
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
      return NextResponse.json({ error: "Nessun utente trovato" }, { status: 404 });
    }

    // Verifica che quell'account non sia già collegato a un altro Child
    const alreadyLinked = await prisma.child.findUnique({ where: { userId: targetUser.id } });
    if (alreadyLinked && alreadyLinked.id !== childId) {
      return NextResponse.json({ error: "Questo account è già collegato a un altro figlio" }, { status: 409 });
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

    const linkRequest = await prisma.linkRequest.create({
      data: {
        childId,
        parentId: session.user.id,
        targetUserId: targetUser.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
      },
    });

    // Notifica in-app per il destinatario
    await prisma.appNotification.create({
      data: {
        type: "LINK_REQUEST",
        title: `${parent?.name ?? "Un genitore"} vuole collegarsi a te`,
        body: `Hai ricevuto una richiesta di collegamento genitore-figlio per il profilo "${child.name}".`,
        url: "/profilo#richieste",
        targetUserId: targetUser.id,
      },
    });

    // Push al destinatario
    await sendPushToUser(targetUser.id, {
      title: `${parent?.name ?? "Un genitore"} vuole collegarsi a te`,
      body: `Richiesta di collegamento per il profilo "${child.name}". Vai al tuo profilo per rispondere.`,
      url: "/profilo#richieste",
      type: "LINK_REQUEST",
    });

    return NextResponse.json({ pending: true, requestId: linkRequest.id });
  }

  // ── Scollega account ──────────────────────────────────────────────────────
  if (unlinkAccount) {
    const updated = await prisma.child.update({
      where: { id: childId },
      data: { userId: null },
    });
    return NextResponse.json(updated);
  }

  // ── Aggiornamento dati base ───────────────────────────────────────────────
  const trimmedName = name?.trim().slice(0, 60);
  if (trimmedName !== undefined && !trimmedName) {
    return NextResponse.json({ error: "Il nome non può essere vuoto" }, { status: 400 });
  }

  const updated = await prisma.child.update({
    where: { id: childId },
    data: {
      ...(trimmedName !== undefined && { name: trimmedName }),
      ...(sportRole !== undefined && { sportRole: sportRole ?? null }),
      ...(sportRoleVariant !== undefined && { sportRoleVariant: sportRoleVariant ?? null }),
      ...(gender !== undefined && { gender: (gender as "MALE" | "FEMALE" | null) ?? null }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
    },
  });

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
  // poi elimina le iscrizioni e azzera le squadre (evita riferimenti fantasma)
  const childRegs = await prisma.registration.findMany({
    where: { childId },
    select: { sessionId: true },
  });
  if (childRegs.length > 0) {
    const sessionIds = [...new Set(childRegs.map((r) => r.sessionId))];
    await prisma.registration.deleteMany({ where: { childId } });
    await prisma.trainingSession.updateMany({
      where: { id: { in: sessionIds } },
      data: { teams: Prisma.DbNull },
    });
  }

  await prisma.child.delete({ where: { id: childId } });
  return new NextResponse(null, { status: 204 });
}
