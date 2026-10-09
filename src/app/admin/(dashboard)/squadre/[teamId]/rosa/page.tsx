import { redirect, notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/adminAccess";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/common/PageHeader";
import AdminRosaClient from "@/components/admin/AdminRosaClient";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Gestione rosa | Admin" };

type Params = { params: Promise<{ teamId: string }> };

const ATHLETE_SELECT = {
  id: true,
  name: true,
  sportRole: true,
  sportRoleVariant: true,
  gender: true,
  birthDate: true,
} as const;

const TEAM_INCLUDE = {
  memberships: {
    orderBy: [{ isCaptain: "desc" }, { createdAt: "asc" }],
    include: {
      user: { select: { ...ATHLETE_SELECT, image: true } },
      child: { select: ATHLETE_SELECT },
    },
  },
} satisfies Prisma.CompetitiveTeamInclude;

export default async function AdminRosaPage({ params }: Params) {
  const { role } = await requireAdminPage("/admin/squadre");

  const { teamId } = await params;

  const team = await prisma.competitiveTeam.findUnique({
    where: { id: teamId },
    include: TEAM_INCLUDE,
  });
  if (!team) notFound();
  // La Karibu di stagione non ha una rosa propria da gestire.
  if (team.isMixed) redirect("/admin/squadre");

  // La rosa la modifica solo l'admin (API members con `isAdminUser`): allenatore
  // e dirigente la leggono soltanto, e il pool di chi si può aggiungere non serve.
  const isAdmin = hasRole(role, "ADMIN");
  if (!isAdmin) {
    return (
      <>
        <RosaHeader team={team} />
        <AdminRosaClient
          team={rosaTeam(team)}
          users={[]}
          childPlayers={[]}
          otherTeams={[]}
          isAdmin={false}
        />
      </>
    );
  }

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
    // Solo figli senza account: chi ha un account si aggiunge come utente,
    // e la sua scheda figlio (legame coi genitori) sarebbe un doppione.
    prisma.child.findMany({
      where: { userId: null },
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
      <RosaHeader team={team} />
      <AdminRosaClient
        team={rosaTeam(team)}
        users={users}
        childPlayers={children}
        otherTeams={otherTeams}
        isAdmin
      />
    </>
  );
}

type LoadedTeam = Prisma.CompetitiveTeamGetPayload<{ include: typeof TEAM_INCLUDE }>;

function RosaHeader({ team }: { team: LoadedTeam }) {
  return (
    <PageHeader
      title={`Rosa di ${team.name}`}
      subtitle={`Stagione ${team.season}${team.championship ? ` · ${team.championship}` : ""}`}
      breadcrumb={[
        { label: "Dashboard", href: "/admin" },
        { label: "Squadre", href: "/admin/squadre" },
        { label: team.name },
      ]}
    />
  );
}

function rosaTeam(team: LoadedTeam) {
  return {
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
  };
}
