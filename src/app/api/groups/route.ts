import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { GroupCreateSchema } from "@/lib/schemas/group";

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

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name.trim(),
      season: parsed.data.season.trim(),
      championship: parsed.data.championship?.trim() || null,
      teamId: parsed.data.teamId,
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { matches: true } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
