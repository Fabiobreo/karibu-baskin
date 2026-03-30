import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AppRole } from "@prisma/client";

const VALID_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];

// PATCH /api/users/[userId] — cambia il ruolo (solo ADMIN, protezione via middleware)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await req.json();
  const { appRole } = body as { appRole: AppRole };

  if (!VALID_ROLES.includes(appRole)) {
    return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { appRole },
    select: { id: true, name: true, email: true, appRole: true },
  });

  return NextResponse.json(user);
}
