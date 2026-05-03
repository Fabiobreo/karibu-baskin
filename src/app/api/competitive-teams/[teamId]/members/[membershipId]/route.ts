import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { createAppNotification } from "@/lib/appNotifications";

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
  const session = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { membershipId } = await params;
  const membership = await prisma.teamMembership.findUnique({
    where: { id: membershipId },
    select: { teamId: true, userId: true, childId: true, team: { select: { name: true } } },
  });
  await prisma.teamMembership.delete({ where: { id: membershipId } });

  if (session?.user?.id && membership) {
    logAudit({ actorId: session.user.id, action: "REMOVE_MEMBER", targetType: "TeamMembership", targetId: membershipId, before: { teamId: membership.teamId, userId: membership.userId, childId: membership.childId } }).catch((err) => console.error("[audit] remove member", err));
  }
  if (membership?.userId) {
    createAppNotification({
      type: "SYSTEM",
      title: "Rimosso da una squadra",
      body: `Sei stato rimosso dalla squadra "${membership.team.name}".`,
      url: "/profilo",
      targetUserId: membership.userId,
    }).catch((err) => console.error("[notification] remove member", err));
  }

  return new NextResponse(null, { status: 204 });
}
