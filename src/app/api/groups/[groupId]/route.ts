import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { computeStandings } from "@/lib/season/standings";
import { GroupUpdateSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { generateGroupSlug } from "@/lib/slugUtils";

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      competitiveTeams: {
        include: {
          competitiveTeam: { select: { id: true, name: true, color: true, season: true } },
        },
      },
      matches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        include: {
          opponent: { select: { id: true, name: true, slug: true, city: true } },
        },
      },
      groupMatches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        include: {
          homeTeam: { select: { id: true, name: true, slug: true } },
          awayTeam: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });

  const ourTeams = group.competitiveTeams.map((gct) => gct.competitiveTeam);
  const standings = computeStandings(ourTeams, group.matches, group.groupMatches);

  return NextResponse.json({ ...group, standings });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;

  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }
  const parsed = GroupUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const before = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true, championship: true, season: true, slug: true },
  });

  let slugUpdate: { slug: string } | object = {};
  if (parsed.data.name !== undefined && before) {
    const newName = parsed.data.name.trim();
    if (newName !== before.name) {
      const newSlug = await generateGroupSlug(newName, before.season);
      if (newSlug) slugUpdate = { slug: newSlug };
    }
  }

  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...("championship" in parsed.data
          ? { championship: parsed.data.championship?.trim() || null }
          : {}),
        ...slugUpdate,
      },
      include: {
        competitiveTeams: {
          include: {
            competitiveTeam: { select: { id: true, name: true, color: true, season: true } },
          },
        },
        _count: { select: { matches: true } },
      },
    });
    if (authSession?.user?.id) {
      logAudit({
        actorId: authSession.user.id,
        action: "UPDATE_GROUP",
        targetType: "Group",
        targetId: groupId,
        before,
        after: { name: group.name, championship: group.championship },
      }).catch((err) => console.error("[audit] update group", err));
    }
    return NextResponse.json(group);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;
  const before = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true, season: true, championship: true },
  });
  await prisma.match.updateMany({ where: { groupId }, data: { groupId: null } });
  try {
    await prisma.group.delete({ where: { id: groupId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });
    }
    throw err;
  }
  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "DELETE_GROUP",
      targetType: "Group",
      targetId: groupId,
      before,
    }).catch((err) => console.error("[audit] delete group", err));
  }
  return new NextResponse(null, { status: 204 });
}
