import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/webpush";

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

  await prisma.$transaction(async (tx) => {
    // Aggiorna stato richiesta
    await tx.linkRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    if (accept) {
      // Verifica che il child non sia già collegato ad altro utente
      const alreadyLinked = await tx.child.findUnique({ where: { userId } });
      if (alreadyLinked && alreadyLinked.id !== linkRequest.childId) {
        throw new Error("Questo account è già collegato a un altro figlio");
      }

      // Collega il child all'utente
      const userUpdates: Record<string, unknown> = {};
      const targetUser = await tx.user.findUnique({ where: { id: userId } });
      if (targetUser?.appRole === "GUEST") userUpdates.appRole = "ATHLETE";
      if (linkRequest.child.sportRole && !targetUser?.sportRole) {
        userUpdates.sportRole = linkRequest.child.sportRole;
        userUpdates.sportRoleVariant = linkRequest.child.sportRoleVariant ?? null;
      }
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userUpdates });
      }
      await tx.child.update({
        where: { id: linkRequest.childId },
        data: { userId },
      });
    }

    // Notifica in-app al genitore
    const parentName = respondingUser?.name ?? "Il tuo figlio/a";
    const childName = linkRequest.child.name;
    await tx.appNotification.create({
      data: {
        type: "LINK_RESPONSE",
        title: accept
          ? `${parentName} ha accettato il collegamento`
          : `${parentName} ha rifiutato il collegamento`,
        body: accept
          ? `L'account di ${parentName} è stato collegato a ${childName}.`
          : `La richiesta di collegamento per ${childName} è stata rifiutata.`,
        url: "/profilo",
        targetUserId: linkRequest.parentId,
      },
    });
  });

  // Invia push al genitore (fuori dalla transaction)
  const parentName = respondingUser?.name ?? "Il tuo figlio/a";
  const childName = linkRequest.child.name;
  await sendPushToUser(linkRequest.parentId, {
    title: accept
      ? `${parentName} ha accettato!`
      : `${parentName} ha rifiutato`,
    body: accept
      ? `L'account è stato collegato a ${childName}.`
      : `La richiesta per ${childName} è stata rifiutata.`,
    url: "/profilo",
  });

  return NextResponse.json({ status: newStatus });
}
