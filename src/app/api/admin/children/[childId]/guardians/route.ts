import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { GuardianLinkSchema } from "@/lib/schemas";

type Params = { params: Promise<{ childId: string }> };

async function staffActorId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) return null;
  return session.user.id;
}

// POST /api/admin/children/[childId]/guardians — collega un altro genitore.
// Tutti i genitori di un figlio hanno gli stessi poteri (vedi @/lib/guardians).
export async function POST(req: NextRequest, { params }: Params) {
  const actorId = await staffActorId();
  if (!actorId) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { childId } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = GuardianLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { userId, promoteParent } = parsed.data;

  const [child, user] = await Promise.all([
    prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, name: true, userId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, appRole: true },
    }),
  ]);
  if (!child) return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "Genitore non trovato" }, { status: 404 });
  if (child.userId === user.id) {
    return NextResponse.json(
      { error: `${child.name} non può essere genitore di sé stesso` },
      { status: 400 }
    );
  }

  const promote = !!promoteParent && user.appRole === "GUEST";
  try {
    await prisma.$transaction(async (tx) => {
      if (promote) {
        await tx.user.update({ where: { id: user.id }, data: { appRole: "PARENT" } });
      }
      await tx.childGuardian.create({ data: { childId, userId: user.id } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: `${user.name ?? "Questo utente"} è già genitore di ${child.name}` },
        { status: 409 }
      );
    }
    console.error("[admin/guardians] link", err);
    return NextResponse.json({ error: "Errore durante il collegamento" }, { status: 500 });
  }

  logAudit({
    actorId,
    action: "LINK_GUARDIAN",
    targetType: "Child",
    targetId: childId,
    after: {
      childName: child.name,
      userId: user.id,
      userName: user.name,
      ...(promote && { parentPromotedFrom: "GUEST" }),
    },
  }).catch((err) => console.error("[audit] link guardian", err));

  return NextResponse.json(
    { childId, name: child.name, parentName: user.name, parentPromoted: promote },
    { status: 201 }
  );
}

// DELETE /api/admin/children/[childId]/guardians?userId=… — scollega un genitore.
// L'ultimo non si scollega: un figlio senza genitori non lo gestirebbe nessuno.
// In quel caso si elimina il figlio.
export async function DELETE(req: NextRequest, { params }: Params) {
  const actorId = await staffActorId();
  if (!actorId) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { childId } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId richiesto" }, { status: 400 });

  const guardians = await prisma.childGuardian.findMany({
    where: { childId },
    select: { userId: true },
  });
  if (!guardians.some((g) => g.userId === userId)) {
    return NextResponse.json({ error: "Collegamento non trovato" }, { status: 404 });
  }
  if (guardians.length <= 1) {
    return NextResponse.json(
      { error: "È l'unico genitore: per toglierlo elimina il figlio" },
      { status: 400 }
    );
  }

  await prisma.childGuardian.delete({ where: { childId_userId: { childId, userId } } });

  logAudit({
    actorId,
    action: "UNLINK_GUARDIAN",
    targetType: "Child",
    targetId: childId,
    before: { userId },
  }).catch((err) => console.error("[audit] unlink guardian", err));

  return new NextResponse(null, { status: 204 });
}
