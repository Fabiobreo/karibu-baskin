import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

const MatchResultSchema = z.object({
  matchup: z.enum(["AB", "AC", "BC"]).optional(),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  scoreC: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const results = await prisma.trainingMatchResult.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(results);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { sessionId } = await params;

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = MatchResultSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }

  const result = await prisma.trainingMatchResult.create({
    data: {
      sessionId,
      matchup: parsed.data.matchup ?? null,
      scoreA: parsed.data.scoreA,
      scoreB: parsed.data.scoreB,
      scoreC: parsed.data.scoreC ?? null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  return NextResponse.json(result, { status: 201 });
}
