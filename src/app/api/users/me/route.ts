import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// GET /api/users/me — profilo dell'utente loggato
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
      createdAt: true,
      sportRole: true,
      sportRoleVariant: true,
      sportRoleSuggested: true,
      sportRoleSuggestedVariant: true,
      childAccount: { select: { id: true } },
      teamMemberships: {
        select: {
          teamId: true,
          team: { select: { name: true, color: true, season: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json(null);

  const { childAccount, teamMemberships, ...rest } = user;
  return NextResponse.json({
    ...rest,
    linkedChildId: childAccount?.id ?? null,
    teamMemberships: teamMemberships.map((m) => ({
      teamId: m.teamId,
      teamName: m.team.name,
      teamColor: m.team.color,
      teamSeason: m.team.season,
    })),
  });
}
