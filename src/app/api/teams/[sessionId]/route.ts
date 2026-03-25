import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTeams } from "@/lib/teamGenerator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  if (registrations.length === 0) {
    return NextResponse.json({ teamA: [], teamB: [] });
  }

  const teams = generateTeams(registrations, sessionId);
  return NextResponse.json(teams);
}
