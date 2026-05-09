import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

const MatchResultUpdateSchema = z.object({
  matchup: z.enum(["AB", "AC", "BC"]).optional(),
  scoreA: z.number().int().min(0).optional(),
  scoreB: z.number().int().min(0).optional(),
  scoreC: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; resultId: string }> }
) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { resultId } = await params;

  const existing = await prisma.trainingMatchResult.findUnique({ where: { id: resultId } });
  if (!existing) {
    return NextResponse.json({ error: "Risultato non trovato" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = MatchResultUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.matchup !== undefined) data.matchup = parsed.data.matchup;
  if (parsed.data.scoreA !== undefined) data.scoreA = parsed.data.scoreA;
  if (parsed.data.scoreB !== undefined) data.scoreB = parsed.data.scoreB;
  if ("scoreC" in parsed.data) data.scoreC = parsed.data.scoreC ?? null;
  if ("notes" in parsed.data) data.notes = parsed.data.notes?.trim() || null;

  const updated = await prisma.trainingMatchResult.update({
    where: { id: resultId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; resultId: string }> }
) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { resultId } = await params;

  const existing = await prisma.trainingMatchResult.findUnique({
    where: { id: resultId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Risultato non trovato" }, { status: 404 });
  }

  await prisma.trainingMatchResult.delete({ where: { id: resultId } });
  return new NextResponse(null, { status: 204 });
}
