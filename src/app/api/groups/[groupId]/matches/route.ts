import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { GroupMatchCreateSchema } from "@/lib/schemas/group";

type Params = { params: Promise<{ groupId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;

  // [CLAUDE - 10:00] Validazione Zod — rimpiazza type assertion as { ... }
  // Il refine() cattura homeTeamId === awayTeamId prima del DB hit
  const body = await req.json().catch(() => ({}));
  const parsed = GroupMatchCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });

  const match = await prisma.groupMatch.create({
    data: {
      groupId,
      matchday: parsed.data.matchday ?? null,
      date: parsed.data.date ? new Date(parsed.data.date) : null,
      homeTeamId: parsed.data.homeTeamId,
      awayTeamId: parsed.data.awayTeamId,
      homeScore: parsed.data.homeScore ?? null,
      awayScore: parsed.data.awayScore ?? null,
    },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true } },
      awayTeam:  { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(match, { status: 201 });
}
