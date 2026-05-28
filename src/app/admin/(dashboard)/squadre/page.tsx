import { prisma } from "@/lib/db";
import AdminSquadreClient from "@/components/AdminSquadreClient";
import AdminPageHeader from "@/components/AdminPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Squadre | Admin" };
export const revalidate = 60;

export default async function AdminSquadrePage() {
  const [teams, seasons] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { memberships: true, matches: true } },
      },
    }),
    prisma.season.findMany(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Gestione Squadre"
        subtitle="Organizza le squadre per stagione."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Squadre" }]}
      />
      <AdminSquadreClient teams={teams} seasons={seasons} />
    </>
  );
}
