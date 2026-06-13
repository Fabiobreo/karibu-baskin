import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminGironiClient from "@/components/admin/AdminGironiClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gironi | Admin" };
export const revalidate = 30;

export default async function AdminGironiPage() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  const [groups, seasons] = await Promise.all([
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
  ]);

  const defaultSeason =
    seasons.find((s) => s.isCurrent)?.label ?? seasons[0]?.label ?? getCurrentSeason();

  return (
    <>
      <AdminPageHeader
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
