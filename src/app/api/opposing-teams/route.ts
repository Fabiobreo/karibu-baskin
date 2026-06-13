import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { OpposingTeamCreateSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { generateOpposingTeamSlug } from "@/lib/slugUtils";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "get-opposing-teams", 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const teams = await prisma.opposingTeam.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { matches: true } } },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = OpposingTeamCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const slug = await generateOpposingTeamSlug(body.name);
  const team = await prisma.opposingTeam.create({
    data: {
      name: body.name.trim(),
      slug: slug || null,
      city: body.city?.trim() || null,
      address: body.address?.trim() || null,
      website: body.website?.trim() || null,
      colors: body.colors?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "CREATE_OPPOSING_TEAM",
      targetType: "OpposingTeam",
      targetId: team.id,
      after: { name: team.name, city: team.city },
    }).catch((err) => console.error("[audit] create opposing team", err));
  }

  return NextResponse.json(team, { status: 201 });
}
