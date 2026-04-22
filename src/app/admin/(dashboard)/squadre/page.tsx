import { prisma } from "@/lib/db";
import AdminSquadreClient from "@/components/AdminSquadreClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Squadre | Admin" };
export const revalidate = 0;

export default async function AdminSquadrePage() {
  const [teams, users, children, seasons] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { memberships: true, matches: true } },
        memberships: {
          orderBy: [{ isCaptain: "desc" }, { createdAt: "asc" }],
          include: {
            user: { select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true } },
            child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { appRole: { in: ["ATHLETE", "COACH", "ADMIN"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true },
    }),
    prisma.child.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, sportRole: true, sportRoleVariant: true },
    }),
    prisma.season.findMany(),
  ]);

  return <AdminSquadreClient teams={teams} users={users} children={children} seasons={seasons} />;
}
