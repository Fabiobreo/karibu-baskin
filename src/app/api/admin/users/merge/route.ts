import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isAdminUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { UserMergeSchema } from "@/lib/schemas";
import { inBackground } from "@/lib/background";
import { createAppNotification } from "@/lib/notifications/appNotifications";
import { mergeBlockers, moveGuestData } from "@/lib/userMerge";

// POST /api/admin/users/merge — unisce un account in attesa (`sourceId`) alla
// scheda che lo staff aveva creato con un'email sbagliata (`targetId`).
//
// La scheda tiene nome, ruoli, squadra e storico e prende dall'ospite l'email e
// gli accessi: chi è già collegato resta collegato e ritrova il suo profilo.
// L'ospite viene eliminato. Solo admin (cambia un'email, sposta credenziali,
// elimina un utente) e non si annulla: le regole stanno in `@/lib/userMerge`.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const actorId = session.user.id;

  const raw = await req.json().catch(() => null);
  const parsed = UserMergeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { sourceId, targetId } = parsed.data;
  if (sourceId === targetId) {
    return NextResponse.json({ error: "Scegli due account diversi" }, { status: 400 });
  }
  if (sourceId === actorId || targetId === actorId) {
    return NextResponse.json({ error: "Non puoi unire il tuo account" }, { status: 400 });
  }

  const [source, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        appRole: true,
        childAccount: { select: { id: true } },
        _count: {
          select: {
            guardianOf: true,
            sentLinkRequests: true,
            receivedLinkRequests: true,
            teamMemberships: true,
            matchStats: true,
            callups: true,
            matchMvps: true,
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true, image: true },
    }),
  ]);
  if (!source) return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Scheda non trovata" }, { status: 404 });

  const blockers = mergeBlockers({
    appRole: source.appRole,
    hasChildAccount: !!source.childAccount,
    guardianOf: source._count.guardianOf,
    linkRequests: source._count.sentLinkRequests + source._count.receivedLinkRequests,
    teamMemberships: source._count.teamMemberships,
    matchRows: source._count.matchStats + source._count.callups + source._count.matchMvps,
  });
  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Questo account non si può unire: ${blockers.join("; ")}.` },
      { status: 409 }
    );
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const moved = await moveGuestData(tx, source.id, target.id);
      // Prima si elimina l'ospite: l'email è unica e va liberata.
      await tx.user.delete({ where: { id: source.id } });
      const user = await tx.user.update({
        where: { id: target.id },
        data: {
          email: source.email,
          emailVerified: source.emailVerified,
          ...(!target.image && source.image && { image: source.image }),
          ...(!target.name?.trim() && source.name && { name: source.name }),
        },
        select: { id: true, name: true, email: true, image: true },
      });
      return { user, moved };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Qualcuno ha appena modificato questi account: riapri e riprova" },
        { status: 409 }
      );
    }
    console.error("[admin/users/merge]", err);
    return NextResponse.json({ error: "Errore durante l'unione" }, { status: 500 });
  }

  inBackground(
    logAudit({
      actorId,
      action: "MERGE_USER",
      targetType: "User",
      targetId: target.id,
      before: {
        email: target.email,
        mergedUserId: source.id,
        mergedUserName: source.name,
        mergedUserEmail: source.email,
      },
      after: { email: result.user.email, registrationsMoved: result.moved.registrations },
    }),
    "audit merge user"
  );
  // Solo in-app: la persona è collegata e il profilo le cambia sotto gli occhi.
  inBackground(
    createAppNotification({
      type: "SYSTEM",
      title: "Abbiamo ritrovato il tuo profilo",
      body: "Lo staff ha unito il tuo accesso al profilo che aveva già preparato per te.",
      url: "/profilo",
      targetUserId: target.id,
    }),
    "notification merge user"
  );

  return NextResponse.json({ ...result.user, registrationsMoved: result.moved.registrations });
}
