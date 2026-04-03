import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { name?: string; city?: string; notes?: string };

  const team = await prisma.opposingTeam.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.city !== undefined && { city: body.city.trim() || null }),
      ...(body.notes !== undefined && { notes: body.notes.trim() || null }),
    },
  });
  return NextResponse.json(team);
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.opposingTeam.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
