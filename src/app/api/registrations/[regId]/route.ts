import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ regId: string }> }
) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { regId } = await params;
  await prisma.registration.delete({ where: { id: regId } });
  return new NextResponse(null, { status: 204 });
}
