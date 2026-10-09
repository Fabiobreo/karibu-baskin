import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import AdminGironiClient from "@/components/admin/AdminGironiClient";
import PageHeader from "@/components/common/PageHeader";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gironi | Admin" };
export const revalidate = 30;

export default async function AdminGironiPage() {
  await requireAdminPage("/admin/gironi");
  const [groups, seasons, defaultSeason] = await Promise.all([
    prisma.group.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        competitiveTeams: {
          include: {
            competitiveTeam: { select: { id: true, name: true, color: true, season: true } },
          },
        },
        _count: { select: { matches: true } },
      },
    }),
    prisma.season.findMany({ orderBy: { label: "desc" } }),
    getCurrentSeasonLabel(),
  ]);

  return (
    <>
      <PageHeader
        title="Gironi"
        subtitle="Gironi di campionato e risultati delle altre squadre del girone."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Gironi" }]}
      />
      <AdminGironiClient
        initialGroups={groups}
        seasons={seasons.map((s) => ({ label: s.label, isCurrent: s.isCurrent }))}
        defaultSeason={defaultSeason}
      />
    </>
  );
}
