import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type Params = { params: Promise<{ teamId: string; membershipId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { membershipId } = await params;
  const body = await req.json() as { isCaptain?: boolean };

  const membership = await prisma.teamMembership.update({
    where: { id: membershipId },
    data: { isCaptain: body.isCaptain ?? false },
  });
  return NextResponse.json(membership);
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { membershipId } = await params;
  await prisma.teamMembership.delete({ where: { id: membershipId } });
  return new NextResponse(null, { status: 204 });
}
