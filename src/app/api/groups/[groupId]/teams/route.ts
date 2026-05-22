import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ groupId: string }> };

async function resolveGroupId(idOrSlug: string): Promise<string | null> {
  const g = await prisma.group.findFirst({
    where: { OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
    select: { id: true },
  });
  return g?.id ?? null;
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;
  const realGroupId = await resolveGroupId(groupId);
  if (!realGroupId) {
    return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const opposingTeamId =
    body && typeof body.opposingTeamId === "string" ? body.opposingTeamId.trim() : "";
  if (!opposingTeamId) {
    return NextResponse.json({ error: "Squadra avversaria non valida" }, { status: 400 });
  }

  try {
    const created = await prisma.groupTeam.create({
      data: { groupId: realGroupId, opposingTeamId },
      include: {
        opposingTeam: { select: { id: true, name: true, slug: true, city: true } },
      },
    });
    return NextResponse.json(created.opposingTeam, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Squadra già presente nel girone" }, { status: 409 });
      }
      if (err.code === "P2003") {
        return NextResponse.json({ error: "Squadra avversaria non trovata" }, { status: 404 });
      }
    }
    throw err;
  }
}
