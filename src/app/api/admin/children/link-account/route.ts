import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { AccountChildLinkSchema } from "@/lib/schemas";

// POST /api/admin/children/link-account — lo staff collega a un genitore un
// figlio che ha già un proprio account (es. un atleta figlio di un tesserato).
//
// Il legame genitore ↔ figlio vive sul record Child: qui nasce la scheda figlio
// legata all'account (`Child.userId`), con i dati del profilo, e il genitore
// come primo tutore. È lo stesso stato che si ottiene quando il figlio accetta
// una richiesta di collegamento, fatto dallo staff.
//
// La scheda nasce senza slug: il profilo pubblico resta quello dell'account, e
// la ricerca pubblica non mostra la stessa persona due volte. Il ruolo
// dell'account non cambia.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = AccountChildLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { parentId, userId, promoteParent } = parsed.data;
  if (parentId === userId) {
    return NextResponse.json(
      { error: "Genitore e figlio devono essere due persone diverse" },
      { status: 400 }
    );
  }

  const [parent, account] = await Promise.all([
    prisma.user.findUnique({
      where: { id: parentId },
      select: { id: true, name: true, appRole: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        sportRole: true,
        sportRoleVariant: true,
        gender: true,
        birthDate: true,
        childAccount: { select: { id: true } },
      },
    }),
  ]);
  if (!parent) return NextResponse.json({ error: "Genitore non trovato" }, { status: 404 });
  if (!account) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  const accountName = account.name?.trim() || account.email;
  if (account.childAccount) {
    return NextResponse.json(
      { error: `${accountName} ha già una scheda figlio: collegala dalla ricerca dei figli` },
      { status: 409 }
    );
  }

  const promote = !!promoteParent && parent.appRole === "GUEST";
  try {
    const child = await prisma.$transaction(async (tx) => {
      if (promote) {
        await tx.user.update({ where: { id: parent.id }, data: { appRole: "PARENT" } });
      }
      return tx.child.create({
        data: {
          name: accountName,
          userId: account.id,
          sportRole: account.sportRole,
          sportRoleVariant: account.sportRoleVariant,
          gender: account.gender,
          birthDate: account.birthDate,
          guardians: { create: { userId: parent.id } },
        },
        select: { id: true, name: true },
      });
    });

    logAudit({
      actorId: session.user.id,
      action: "LINK_GUARDIAN",
      targetType: "Child",
      targetId: child.id,
      after: {
        childName: child.name,
        accountUserId: account.id,
        userId: parent.id,
        userName: parent.name,
        ...(promote && { parentPromotedFrom: "GUEST" }),
      },
    }).catch((err) => console.error("[audit] link account child", err));

    return NextResponse.json(
      { ...child, parentName: parent.name, parentPromoted: promote },
      { status: 201 }
    );
  } catch (err) {
    // Gara con un'altra richiesta: l'account ha appena ricevuto una scheda.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: `${accountName} ha già una scheda figlio` },
        { status: 409 }
      );
    }
    console.error("[admin/children/link-account]", err);
    return NextResponse.json({ error: "Errore durante il collegamento" }, { status: 500 });
  }
}
