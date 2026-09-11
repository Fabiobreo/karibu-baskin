import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { deleteImage } from "@/lib/blob";
import { MeUpdateSchema } from "@/lib/schemas/me";
import { setOwnName } from "@/lib/userName";

// GET /api/users/me — profilo dell'utente loggato
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      customImage: true,
      appRole: true,
      createdAt: true,
      sportRole: true,
      sportRoleVariant: true,
      sportRoleSuggested: true,
      sportRoleSuggestedVariant: true,
      childAccount: { select: { id: true } },
      teamMemberships: {
        select: {
          teamId: true,
          team: { select: { name: true, color: true, season: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json(null);

  const { childAccount, teamMemberships, ...rest } = user;
  return NextResponse.json({
    ...rest,
    linkedChildId: childAccount?.id ?? null,
    teamMemberships: teamMemberships.map((m) => ({
      teamId: m.teamId,
      teamName: m.team.name,
      teamColor: m.team.color,
      teamSeason: m.team.season,
    })),
  });
}

// PUT /api/users/me — aggiorna dati profilo dell'utente loggato
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = MeUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { customImage, name } = parsed.data;
  const userId = session.user.id;

  try {
    // Nome inserito dall'utente (magic link, o correzione dal profilo): regole
    // su Google, slug e notifica allo staff stanno tutte in setOwnName.
    if (name !== undefined) {
      const result = await setOwnName(userId, name);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
    }

    if (customImage !== undefined) {
      // Recupera la vecchia immagine per eliminare il Blob orfano
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { customImage: true },
      });
      // Se si sta rimuovendo (null) o sostituendo, elimina il vecchio file
      if (current?.customImage && current.customImage !== customImage) {
        deleteImage(current.customImage).catch((e) => console.error("[blob] delete old avatar", e));
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(customImage !== undefined && { customImage }),
      },
      select: { id: true, name: true, customImage: true },
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("[users/me] PUT", err);
    return NextResponse.json({ error: "Errore nel salvataggio del profilo" }, { status: 500 });
  }
}
