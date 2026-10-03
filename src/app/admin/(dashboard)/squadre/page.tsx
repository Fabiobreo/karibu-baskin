import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import AdminSquadreClient from "@/components/admin/AdminSquadreClient";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Squadre | Admin" };
export const revalidate = 60;

export default async function AdminSquadrePage() {
  const [session, teams, seasons] = await Promise.all([
    auth(),
    prisma.competitiveTeam.findMany({
      // La Karibu di stagione è nascosta: nasce da sola e non si gestisce qui.
      where: { isMixed: false },
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { memberships: true, matches: true } },
      },
    }),
    prisma.season.findMany(),
  ]);

  return (
    <>
      <PageHeader
        title="Squadre"
        subtitle="Organizza le squadre per stagione."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Squadre" }]}
      />
      <AdminSquadreClient
        teams={teams}
        seasons={seasons}
        isAdmin={!!session?.user && hasRole(session.user.appRole, "ADMIN")}
      />
    </>
  );
}
