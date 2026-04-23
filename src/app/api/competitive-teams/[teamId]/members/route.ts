import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { TeamMemberSchema } from "@/lib/schemas/registration";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { createAppNotification } from "@/lib/appNotifications";

type Params = { params: Promise<{ teamId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { teamId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = TeamMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

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
      team: { select: { name: true } },
    },
  });
  if (session?.user?.id) {
    logAudit({ actorId: session.user.id, action: "ADD_MEMBER", targetType: "TeamMembership", targetId: membership.id, after: { teamId, userId: body.userId, childId: body.childId } }).catch(() => {});
  }
  if (body.userId) {
    createAppNotification({
      type: "SYSTEM",
      title: "Aggiunto a una squadra",
      body: `Sei stato aggiunto alla squadra "${membership.team.name}".`,
      url: "/profilo",
      targetUserId: body.userId,
    }).catch(() => {});
  }

  return NextResponse.json(membership, { status: 201 });
}
