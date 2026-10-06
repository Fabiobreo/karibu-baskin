import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import AdminSquadreClient from "@/components/admin/AdminSquadreClient";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Squadre | Admin" };
export const revalidate = 60;

export default async function AdminSquadrePage() {
  const [session, allTeams, seasons] = await Promise.all([
    auth(),
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { memberships: true, matches: true } },
      },
    }),
    prisma.season.findMany(),
  ]);
  // La Karibu di stagione nasce da sola e non è una tessera come le altre: qui
  // lo staff decide solo se in quella stagione gioca il campionato.
  const teams = allTeams.filter((t) => !t.isMixed);
  const clubTeams = allTeams.filter((t) => t.isMixed);

  return (
    <>
      <PageHeader
        title="Squadre"
        subtitle="Organizza le squadre per stagione."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Squadre" }]}
      />
      <AdminSquadreClient
        teams={teams}
        clubTeams={clubTeams}
        seasons={seasons}
        isAdmin={!!session?.user && hasRole(session.user.appRole, "ADMIN")}
      />
    </>
  );
}
