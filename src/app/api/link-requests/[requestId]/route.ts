import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ requestId: string }> };

// DELETE — il richiedente (parentId) può cancellare una richiesta PENDING
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { requestId } = await params;

  const linkRequest = await prisma.linkRequest.findUnique({
    where: { id: requestId },
    select: { parentId: true, status: true },
  });

  if (!linkRequest) {
    return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
  }

  if (linkRequest.parentId !== session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  if (linkRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Richiesta già elaborata, non cancellabile" }, { status: 409 });
  }

  await prisma.linkRequest.delete({ where: { id: requestId } });

  return new NextResponse(null, { status: 204 });
}
