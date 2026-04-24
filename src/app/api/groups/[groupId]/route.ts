import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      team: { select: { id: true, name: true, color: true, season: true } },
      matches: {
        orderBy: { date: "asc" },
        include: {
          opponent: { select: { id: true, name: true, city: true } },
        },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });
  return NextResponse.json(group);
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;
  const body = await req.json().catch(() => ({})) as {
    name?: string;
    championship?: string | null;
  };

  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...("championship" in body ? { championship: body.championship?.trim() || null } : {}),
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { matches: true } },
    },
  });

  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;
  // Scollega le partite dal girone prima di eliminarlo
  await prisma.match.updateMany({ where: { groupId }, data: { groupId: null } });
  await prisma.group.delete({ where: { id: groupId } });

  return new NextResponse(null, { status: 204 });
}
