import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type Params = { params: Promise<{ teamId: string }> };

export async function POST(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { teamId } = await params;
  const body = await req.json() as {
    userId?: string;
    childId?: string;
    isCaptain?: boolean;
  };

  if (!body.userId && !body.childId) {
    return NextResponse.json({ error: "userId o childId obbligatorio" }, { status: 400 });
  }

  const membership = await prisma.teamMembership.create({
    data: {
      teamId,
      userId: body.userId ?? null,
      childId: body.childId ?? null,
      isCaptain: body.isCaptain ?? false,
    },
    include: {
      user: { select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true } },
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
    },
  });
  return NextResponse.json(membership, { status: 201 });
}
