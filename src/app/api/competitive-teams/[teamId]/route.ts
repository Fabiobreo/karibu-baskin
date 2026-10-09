import { NextResponse } from "next/server";
import { isPublicTeam } from "@/lib/matches/mixedTeam";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isAdminUser, isCoachOrAdmin, isMember } from "@/lib/apiAuth";
import { publicSubjects } from "@/lib/minors";
import { CompetitiveTeamUpdateSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { deleteImage } from "@/lib/blob";
import { inBackground } from "@/lib/background";

type Params = { params: Promise<{ teamId: string }> };

// La Karibu di stagione (vedi @/lib/matches/mixedTeam) è gestita dall'app.
const KARIBU_LOCKED =
  "La squadra Karibu della stagione è automatica: non si modifica né si elimina";

export async function GET(req: Request, { params }: Params) {
  const rl = checkRateLimit(getClientIp(req), "get-competitive-team", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  const { teamId } = await params;

  const team = await prisma.competitiveTeam.findUnique({
    where: { id: teamId },
    include: {
      memberships: {
        orderBy: [{ isCaptain: "desc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              sportRole: true,
              sportRoleVariant: true,
              gender: true,
              birthDate: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              sportRole: true,
              sportRoleVariant: true,
              gender: true,
              birthDate: true,
            },
          },
        },
      },
      matches: {
        orderBy: { date: "desc" },
        include: {
          opponent: { select: { id: true, name: true, city: true } },
        },
      },
    },
  });

  // La Karibu di stagione nascosta non ha una pagina pubblica: esiste solo per
  // lo staff. Quella iscritta al campionato è pubblica come le altre.
  if (!team || (!isPublicTeam(team) && !(await isCoachOrAdmin()))) {
    return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });
  }
  // Tutela dei minori: chi non è tesserato non li vede, e birthDate non esce
  // mai (serve solo a decidere). Vedi publicSubjects in @/lib/minors.
  return NextResponse.json({
    ...team,
    memberships: publicSubjects(team.memberships, await isMember()),
  });
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { teamId } = await params;

  const parsed = CompetitiveTeamUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const current = await prisma.competitiveTeam.findUnique({
    where: { id: teamId },
    select: { imageUrl: true, isMixed: true, playsLeague: true },
  });
  if (current?.isMixed) {
    // Nascosta: non si tocca. Iscritta al campionato: ha una pagina pubblica,
    // quindi campionato, descrizione e foto si scrivono; nome, stagione e
    // tinta restano quelli dell'app.
    if (!current.playsLeague) {
      return NextResponse.json({ error: KARIBU_LOCKED }, { status: 400 });
    }
    if (body.name !== undefined || body.season !== undefined || body.color !== undefined) {
      return NextResponse.json(
        { error: "Della Karibu si cambiano solo campionato, descrizione e foto" },
        { status: 400 }
      );
    }
  }

  // Gestione immagine: elimina la vecchia se viene sostituita o rimossa
  if (body.imageUrl !== undefined && current?.imageUrl && current.imageUrl !== body.imageUrl) {
    inBackground(deleteImage(current.imageUrl), "blob delete team image");
  }

  try {
    const team = await prisma.competitiveTeam.update({
      where: { id: teamId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.season !== undefined && { season: body.season }),
        ...(body.championship !== undefined && { championship: body.championship?.trim() || null }),
        ...(body.color !== undefined && { color: body.color?.trim() || null }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      },
    });
    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "UPDATE_TEAM",
          targetType: "CompetitiveTeam",
          targetId: teamId,
          after: body as Record<string, unknown>,
        }),
        "audit update team"
      );
    }
    return NextResponse.json(team);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { teamId } = await params;

  // Recupera l'URL immagine prima di eliminare per fare cleanup su Blob
  const team = await prisma.competitiveTeam.findUnique({
    where: { id: teamId },
    select: { imageUrl: true, isMixed: true },
  });
  // Eliminarla cancellerebbe a cascata le sue partite; e rinascerebbe subito.
  if (team?.isMixed) {
    return NextResponse.json({ error: KARIBU_LOCKED }, { status: 400 });
  }

  try {
    await prisma.competitiveTeam.delete({ where: { id: teamId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });
    }
    throw err;
  }

  inBackground(deleteImage(team?.imageUrl), "blob delete team image on delete");

  if (session?.user?.id) {
    inBackground(
      logAudit({
        actorId: session.user.id,
        action: "DELETE_TEAM",
        targetType: "CompetitiveTeam",
        targetId: teamId,
      }),
      "audit delete team"
    );
  }
  return new NextResponse(null, { status: 204 });
}
