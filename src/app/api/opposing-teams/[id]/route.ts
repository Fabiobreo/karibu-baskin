import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { OpposingTeamUpdateSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { generateOpposingTeamSlug } from "@/lib/slugUtils";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = OpposingTeamUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const { id } = await params;
  const before = await prisma.opposingTeam.findUnique({
    where: { id },
    select: { name: true, city: true, notes: true, slug: true },
  });
  let newSlug: string | undefined;
  if (body.name !== undefined && body.name.trim() !== before?.name) {
    const generated = await generateOpposingTeamSlug(body.name);
    if (generated) newSlug = generated;
  }
  const team = await prisma.opposingTeam.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(newSlug !== undefined && { slug: newSlug }),
      ...(body.city !== undefined && { city: body.city?.trim() || null }),
      ...(body.address !== undefined && { address: body.address?.trim() || null }),
      ...(body.website !== undefined && { website: body.website?.trim() || null }),
      ...(body.colors !== undefined && { colors: body.colors?.trim() || null }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...("ratingMu" in body && { ratingMu: body.ratingMu ?? null }),
    },
  });
  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "UPDATE_OPPOSING_TEAM",
      targetType: "OpposingTeam",
      targetId: id,
      before,
      after: { name: team.name, city: team.city, notes: team.notes },
    }).catch((err) => console.error("[audit] update opposing team", err));
  }
  return NextResponse.json(team);
}

export async function DELETE(_req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.opposingTeam.findUnique({
    where: { id },
    select: { name: true, city: true },
  });
  await prisma.opposingTeam.delete({ where: { id } });
  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "DELETE_OPPOSING_TEAM",
      targetType: "OpposingTeam",
      targetId: id,
      before,
    }).catch((err) => console.error("[audit] delete opposing team", err));
  }
  return new NextResponse(null, { status: 204 });
}
