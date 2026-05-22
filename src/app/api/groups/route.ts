import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { GroupCreateSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { generateGroupSlug } from "@/lib/slugUtils";

export async function GET(req: NextRequest) {
  const season = req.nextUrl.searchParams.get("season");
  const teamId = req.nextUrl.searchParams.get("teamId");

  const groups = await prisma.group.findMany({
    where: {
      ...(season ? { season } : {}),
      ...(teamId ? { teamId } : {}),
    },
    orderBy: [{ season: "desc" }, { name: "asc" }],
    include: {
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { matches: true } },
    },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = GroupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const name = parsed.data.name.trim();
  const season = parsed.data.season.trim();
  const slug = (await generateGroupSlug(name, season)) || null;

  const group = await prisma.group.create({
    data: {
      name,
      season,
      championship: parsed.data.championship?.trim() || null,
      teamId: parsed.data.teamId,
      slug,
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { matches: true } },
    },
  });

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "CREATE_GROUP",
      targetType: "Group",
      targetId: group.id,
      after: {
        name: group.name,
        season: group.season,
        championship: group.championship,
        teamId: group.teamId,
      },
    }).catch((err) => console.error("[audit] create group", err));
  }

  return NextResponse.json(group, { status: 201 });
}
