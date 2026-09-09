import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminRosaClient from "@/components/admin/AdminRosaClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione rosa | Admin" };

type Params = { params: Promise<{ teamId: string }> };

export default async function AdminRosaPage({ params }: Params) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }

  const { teamId } = await params;

  const team = await prisma.competitiveTeam.findUnique({
    where: { id: teamId },
    include: {
      memberships: {
        orderBy: [{ isCaptain: "desc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              sportRole: true,
              sportRoleVariant: true,
              gender: true,
              birthDate: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              sportRole: true,
              sportRoleVariant: true,
              gender: true,
              birthDate: true,
            },
          },
        },
      },
    },
  });
  if (!team) notFound();

  const [users, children, otherTeams] = await Promise.all([
    prisma.user.findMany({
      where: { appRole: { in: ["ATHLETE", "COACH", "ADMIN"] } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        image: true,
        sportRole: true,
        sportRoleVariant: true,
        gender: true,
        birthDate: true,
      },
    }),
    prisma.child.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sportRole: true,
        sportRoleVariant: true,
        gender: true,
        birthDate: true,
      },
    }),
    // Altre squadre della stessa stagione, per segnalare chi è già altrove
    prisma.competitiveTeam.findMany({
      where: { season: team.season, id: { not: team.id } },
      select: {
        id: true,
        name: true,
        memberships: { select: { userId: true, childId: true } },
      },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title={`Rosa di ${team.name}`}
        subtitle={`Stagione ${team.season}${team.championship ? ` · ${team.championship}` : ""}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Squadre", href: "/admin/squadre" },
          { label: team.name },
        ]}
      />
      <AdminRosaClient
        team={{
          id: team.id,
          name: team.name,
          season: team.season,
          color: team.color,
          memberships: team.memberships.map((m) => ({
            id: m.id,
            isCaptain: m.isCaptain,
            userId: m.userId,
            childId: m.childId,
            user: m.user,
            child: m.child,
          })),
        }}
        users={users}
        childPlayers={children}
        otherTeams={otherTeams}
      />
    </>
  );
}
