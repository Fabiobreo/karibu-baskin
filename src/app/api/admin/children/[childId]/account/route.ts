import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { ChildAccountSchema } from "@/lib/schemas";
import { inBackground } from "@/lib/background";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";

type Params = { params: Promise<{ childId: string }> };

async function staffActorId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) return null;
  return session.user.id;
}

// PUT /api/admin/children/[childId]/account — lo staff lega una scheda figlio
// già esistente all'account che il ragazzo si è fatto dopo. È lo stesso stato
// di una richiesta di collegamento accettata (`Child.userId`), senza l'attesa.
//
// Lo storico (iscrizioni, statistiche, squadra) resta sulla scheda. L'account
// in attesa diventa Atleta e prende dalla scheda ruolo Baskin, genere e data di
// nascita solo dove non ne ha di suoi. Dove account e scheda hanno la stessa
// iscrizione o la stessa squadra resta la riga della scheda.
export async function PUT(req: NextRequest, { params }: Params) {
  const actorId = await staffActorId();
  if (!actorId) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { childId } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = ChildAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const [child, user] = await Promise.all([
    prisma.child.findUnique({
      where: { id: childId },
      select: {
        id: true,
        name: true,
        userId: true,
        sportRole: true,
        sportRoleVariant: true,
        gender: true,
        birthDate: true,
        guardians: { select: { userId: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        name: true,
        email: true,
        appRole: true,
        sportRole: true,
        gender: true,
        birthDate: true,
        childAccount: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!child) return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "Account non trovato" }, { status: 404 });

  if (child.userId === user.id) {
    return NextResponse.json({ childId, userId: user.id, promoted: false });
  }
  if (child.userId) {
    return NextResponse.json(
      { error: `${child.name} è già collegato a un altro account: scollegalo prima` },
      { status: 409 }
    );
  }
  if (user.childAccount) {
    return NextResponse.json(
      {
        error: `Questo account è già collegato alla scheda di ${user.childAccount.name}. Scollegalo prima da lì.`,
      },
      { status: 409 }
    );
  }
  if (child.guardians.some((g) => g.userId === user.id)) {
    return NextResponse.json(
      {
        error: `Questo account è un genitore di ${child.name}: non può essere anche il suo account`,
      },
      { status: 409 }
    );
  }

  const promote = user.appRole === "GUEST";
  const copyRole = user.sportRole === null && child.sportRole !== null;
  const userData: Prisma.UserUpdateInput = {
    ...(promote && { appRole: "ATHLETE" }),
    ...(copyRole && {
      sportRole: child.sportRole,
      sportRoleVariant: child.sportRoleVariant,
      sportRoleSuggested: null,
      sportRoleSuggestedVariant: null,
    }),
    ...(user.gender === null && child.gender && { gender: child.gender }),
    ...(user.birthDate === null && child.birthDate && { birthDate: child.birthDate }),
  };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.child.update({ where: { id: childId }, data: { userId: user.id } });
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: user.id }, data: userData });
      }
      if (copyRole && child.sportRole !== null) {
        await tx.sportRoleHistory.create({
          data: { userId: user.id, sportRole: child.sportRole },
        });
      }

      // Doppioni: stessa sessione o stessa squadra su account e scheda.
      const [childRegs, childTeams] = await Promise.all([
        tx.registration.findMany({ where: { childId }, select: { sessionId: true } }),
        tx.teamMembership.findMany({ where: { childId }, select: { teamId: true } }),
      ]);
      await tx.registration.deleteMany({
        where: { userId: user.id, sessionId: { in: childRegs.map((r) => r.sessionId) } },
      });
      await tx.teamMembership.deleteMany({
        where: { userId: user.id, teamId: { in: childTeams.map((m) => m.teamId) } },
      });

      // Le richieste in attesa su questa scheda non servono più.
      await tx.linkRequest.updateMany({
        where: { childId, status: "PENDING", targetUserId: user.id },
        data: { status: "ACCEPTED" },
      });
      await tx.linkRequest.updateMany({
        where: { childId, status: "PENDING" },
        data: { status: "REJECTED" },
      });
    });
  } catch (err) {
    // Gara con un'altra richiesta: l'account ha appena ricevuto una scheda.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Questo account è appena stato collegato a un'altra scheda" },
        { status: 409 }
      );
    }
    console.error("[admin/children/account] link", err);
    return NextResponse.json({ error: "Errore durante il collegamento" }, { status: 500 });
  }

  inBackground(
    logAudit({
      actorId,
      action: "LINK_CHILD_ACCOUNT",
      targetType: "Child",
      targetId: childId,
      after: {
        childName: child.name,
        accountUserId: user.id,
        accountEmail: user.email,
        ...(promote && { promotedFrom: "GUEST" }),
        ...(copyRole && { sportRoleCopied: child.sportRole }),
      },
    }),
    "audit link child account"
  );
  // Solo in-app, al ragazzo e ai genitori: nessuno deve scoprirlo per caso.
  inBackground(
    createTargetedAppNotifications([user.id, ...child.guardians.map((g) => g.userId)], {
      type: "SYSTEM",
      title: "Account collegato",
      body: `Lo staff ha collegato il profilo di ${child.name} al suo account.`,
      url: "/profilo",
    }),
    "notification link child account"
  );

  return NextResponse.json({ childId, userId: user.id, promoted: promote });
}

// DELETE /api/admin/children/[childId]/account — scollega l'account dalla
// scheda: è il rimedio a un collegamento con la persona sbagliata. L'account
// resta (con il ruolo e i dati che ha), lo storico resta sulla scheda.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const actorId = await staffActorId();
  if (!actorId) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { childId } = await params;

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { name: true, userId: true },
  });
  if (!child) return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
  if (!child.userId) return new NextResponse(null, { status: 204 });

  try {
    await prisma.child.update({ where: { id: childId }, data: { userId: null } });
  } catch (err) {
    console.error("[admin/children/account] unlink", err);
    return NextResponse.json({ error: "Errore durante lo scollegamento" }, { status: 500 });
  }

  inBackground(
    logAudit({
      actorId,
      action: "UNLINK_CHILD_ACCOUNT",
      targetType: "Child",
      targetId: childId,
      before: { childName: child.name, accountUserId: child.userId },
    }),
    "audit unlink child account"
  );
  inBackground(
    createTargetedAppNotifications([child.userId], {
      type: "SYSTEM",
      title: "Collegamento rimosso",
      body: `Lo staff ha scollegato il tuo account dal profilo di ${child.name}.`,
      url: "/profilo",
    }),
    "notification unlink child account"
  );

  return new NextResponse(null, { status: 204 });
}
