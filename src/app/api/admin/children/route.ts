import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { AdminChildCreateSchema } from "@/lib/schemas";
import { generateChildSlug } from "@/lib/slugUtils";

// POST /api/admin/children — lo staff crea un figlio e lo collega a un genitore.
// Serve a preparare i dati (backfill) senza chiedere al genitore di farlo dal
// suo profilo. Il genitore lo ritrova in /profilo come se l'avesse creato lui.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = AdminChildCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { parentId, name, sportRole, gender, birthDate, parentalConsent, promoteParent } =
    parsed.data;

  const parent = await prisma.user.findUnique({
    where: { id: parentId },
    select: { id: true, name: true, appRole: true },
  });
  if (!parent) {
    return NextResponse.json({ error: "Genitore non trovato" }, { status: 404 });
  }

  const slug = await generateChildSlug(name);
  // Solo un GUEST sale a PARENT: un atleta o un coach che è anche genitore
  // mantiene il suo ruolo, che vale già di più.
  const promote = !!promoteParent && parent.appRole === "GUEST";

  try {
    const child = await prisma.$transaction(async (tx) => {
      if (promote) {
        await tx.user.update({ where: { id: parent.id }, data: { appRole: "PARENT" } });
      }
      return tx.child.create({
        data: {
          guardians: { create: { userId: parent.id } },
          name,
          ...(slug ? { slug } : {}),
          sportRole: sportRole ?? null,
          gender: gender ?? null,
          birthDate: birthDate ? new Date(`${birthDate}T00:00:00Z`) : null,
          parentalConsentAt: parentalConsent ? new Date() : null,
        },
        select: { id: true, name: true, slug: true },
      });
    });

    logAudit({
      actorId: session.user.id,
      action: "CREATE_CHILD",
      targetType: "Child",
      targetId: child.id,
      after: {
        name: child.name,
        parentId: parent.id,
        parentName: parent.name,
        parentalConsent: !!parentalConsent,
        ...(promote && { parentPromotedFrom: "GUEST" }),
      },
    }).catch((err) => console.error("[audit] create child", err));

    return NextResponse.json(
      { ...child, parentPromoted: promote, parentName: parent.name },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Esiste già un figlio con questi dati" }, { status: 409 });
    }
    console.error("[admin/children] create", err);
    return NextResponse.json({ error: "Errore durante la creazione" }, { status: 500 });
  }
}
