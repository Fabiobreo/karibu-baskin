import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { createAppNotification } from "@/lib/notifications/appNotifications";
import { inBackground } from "@/lib/background";
import { recordTeamExit } from "@/lib/matches/teamHistory";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ teamId: string; membershipId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { membershipId } = await params;
  const body = (await req.json()) as { isCaptain?: boolean };

  const membership = await prisma.teamMembership.update({
    where: { id: membershipId },
    data: { isCaptain: body.isCaptain ?? false },
  });
  return NextResponse.json(membership);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { membershipId } = await params;
  const membership = await prisma.teamMembership.findUnique({
    where: { id: membershipId },
    select: {
      teamId: true,
      userId: true,
      childId: true,
      createdAt: true,
      team: { select: { name: true } },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "Non è più in questa rosa" }, { status: 404 });
  }
  // Chi lascia la squadra resta nello storico: presenze e prestiti delle
  // settimane in cui c'era continuano a valere (@/lib/matches/teamHistory).
  try {
    await prisma.$transaction(async (tx) => {
      await recordTeamExit(tx, membership);
      await tx.teamMembership.delete({ where: { id: membershipId } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Non è più in questa rosa" }, { status: 404 });
    }
    throw err;
  }

  if (session?.user?.id) {
    inBackground(
      logAudit({
        actorId: session.user.id,
        action: "REMOVE_MEMBER",
        targetType: "TeamMembership",
        targetId: membershipId,
        before: {
          teamId: membership.teamId,
          userId: membership.userId,
          childId: membership.childId,
        },
      }),
      "audit remove member"
    );
  }
  if (membership.userId) {
    inBackground(
      createAppNotification({
        type: "SYSTEM",
        title: "Rimosso da una squadra",
        body: `Sei stato rimosso dalla squadra "${membership.team.name}".`,
        url: "/profilo",
        targetUserId: membership.userId,
      }),
      "notification remove member"
    );
  }

  return new NextResponse(null, { status: 204 });
}
