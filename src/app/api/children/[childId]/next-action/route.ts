import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { ChildNextActionSchema } from "@/lib/schemas";

// PUT /api/children/[childId]/next-action — il genitore sceglie se vedere le
// cose da fare per questo figlio (card "prossima cosa da fare", disponibilità
// da dare). Solo per un figlio con un account suo: uno senza account dipende
// dai genitori. Vale solo per chi lo chiede, non per l'altro genitore.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const parsed = ChildNextActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  try {
    const link = await prisma.childGuardian.findUnique({
      where: { childId_userId: { childId, userId: session.user.id } },
      select: { child: { select: { userId: true } } },
    });
    if (!link) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    if (!link.child.userId) {
      return NextResponse.json({ error: "Solo per un figlio con un account suo" }, { status: 409 });
    }
    await prisma.childGuardian.update({
      where: { childId_userId: { childId, userId: session.user.id } },
      data: { showInNextAction: parsed.data.show },
    });
    return NextResponse.json({ show: parsed.data.show });
  } catch (err) {
    console.error("[children/next-action]", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
