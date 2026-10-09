import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/notifications/webpush";

// POST /api/link-requests/[requestId]/respond
// Body: { accept: boolean }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const userId = session.user.id;

  const linkRequest = await prisma.linkRequest.findUnique({
    where: { id: requestId },
    include: {
      child: true,
      parent: { select: { id: true, name: true } },
    },
  });

  if (!linkRequest) {
    return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
  }

  if (linkRequest.targetUserId !== userId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  if (linkRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Richiesta già elaborata" }, { status: 409 });
  }

  if (linkRequest.expiresAt && linkRequest.expiresAt < new Date()) {
    return NextResponse.json({ error: "Richiesta scaduta" }, { status: 410 });
  }

  const body = await req.json().catch(() => ({}));
  const { accept } = body as { accept?: boolean };
  if (typeof accept !== "boolean") {
    return NextResponse.json({ error: "Campo 'accept' mancante" }, { status: 400 });
  }

  const newStatus = accept ? "ACCEPTED" : "REJECTED";
  const respondingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  // Senza scheda figlio (richiesta a chi ha già un account) il nome è quello
  // dell'account: la scheda nasce qui sotto, all'accettazione.
  const responderName = respondingUser?.name ?? "Il tuo figlio/a";
  const childName = linkRequest.child?.name ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      // Aggiorna stato richiesta solo se ancora PENDING — previene doppio accept concorrente
      const { count } = await tx.linkRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: newStatus },
      });
      if (count === 0) {
        throw new Error("Richiesta già elaborata");
      }

      if (accept) {
        // Verifica che il child non sia già collegato ad altro utente
        const alreadyLinked = await tx.child.findUnique({ where: { userId } });
        if (alreadyLinked && alreadyLinked.id !== linkRequest.childId) {
          throw new Error("Questo account è già collegato a un altro figlio");
        }

        // Collega il child all'utente.
        // La promozione è solo a livello appRole (GUEST → ATHLETE).
        // Il ruolo Baskin NON viene copiato automaticamente: richiede conferma esplicita
        // dell'admin per evitare che un genitore malevolo assegni ruoli sportivi a terzi.
        const targetUser = await tx.user.findUnique({ where: { id: userId } });
        if (targetUser?.appRole === "GUEST") {
          await tx.user.update({ where: { id: userId }, data: { appRole: "ATHLETE" } });
        }
        if (linkRequest.childId) {
          await tx.child.update({
            where: { id: linkRequest.childId },
            data: { userId },
          });
        } else {
          // Nessuna scheda da legare: nasce ora, già collegata all'account, con
          // i dati del profilo e il genitore come primo tutore. Senza slug, come
          // quando la collega lo staff: il profilo pubblico resta quello
          // dell'account. Il consenso è quello dato inviando la richiesta.
          await tx.child.create({
            data: {
              name: targetUser?.name?.trim() || targetUser?.email || "?",
              userId,
              sportRole: targetUser?.sportRole ?? null,
              sportRoleVariant: targetUser?.sportRoleVariant ?? null,
              gender: targetUser?.gender ?? null,
              birthDate: targetUser?.birthDate ?? null,
              parentalConsentAt: linkRequest.createdAt,
              guardians: { create: { userId: linkRequest.parentId } },
            },
          });
        }
      }

      // Notifica in-app al genitore
      await tx.appNotification.create({
        data: {
          type: "LINK_RESPONSE",
          title: accept
            ? `${responderName} ha accettato il collegamento`
            : `${responderName} ha rifiutato il collegamento`,
          body: accept
            ? childName
              ? `L'account di ${responderName} è stato collegato a ${childName}.`
              : `Ora trovi ${responderName} tra i tuoi figli.`
            : childName
              ? `La richiesta di collegamento per ${childName} è stata rifiutata.`
              : "La richiesta di collegamento è stata rifiutata.",
          url: "/profilo",
          targetUserId: linkRequest.parentId,
        },
      });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Richiesta già elaborata") {
      return NextResponse.json({ error: "Richiesta già elaborata" }, { status: 409 });
    }
    if (msg === "Questo account è già collegato a un altro figlio") {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    throw err;
  }

  // Invia push al genitore (fuori dalla transaction)
  await sendPushToUser(linkRequest.parentId, {
    title: accept ? `${responderName} ha accettato!` : `${responderName} ha rifiutato`,
    body: accept
      ? childName
        ? `L'account è stato collegato a ${childName}.`
        : `Ora trovi ${responderName} tra i tuoi figli.`
      : childName
        ? `La richiesta per ${childName} è stata rifiutata.`
        : "La richiesta di collegamento è stata rifiutata.",
    url: "/profilo",
    type: "LINK_RESPONSE",
  });

  return NextResponse.json({ status: newStatus });
}
