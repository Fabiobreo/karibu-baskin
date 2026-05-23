import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ groupId: string; competitiveTeamId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId, competitiveTeamId } = await params;

  const g = await prisma.group.findFirst({
    where: { OR: [{ slug: groupId }, { id: groupId }] },
    select: { id: true },
  });
  if (!g) {
    return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });
  }

  try {
    await prisma.groupCompetitiveTeam.delete({
      where: { groupId_competitiveTeamId: { groupId: g.id, competitiveTeamId } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Associazione non trovata" }, { status: 404 });
    }
    throw err;
  }
  return new NextResponse(null, { status: 204 });
}
