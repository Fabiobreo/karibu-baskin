import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { sessionId } = await params;
  await prisma.session.delete({ where: { id: sessionId } });
  return new NextResponse(null, { status: 204 });
}
