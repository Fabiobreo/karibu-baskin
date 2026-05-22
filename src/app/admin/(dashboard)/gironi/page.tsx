import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminGironiClient from "@/components/AdminGironiClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gironi | Admin" };
export const revalidate = 30;

export default async function AdminGironiPage() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  const [groups, teams] = await Promise.all([
    prisma.group.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        team: { select: { id: true, name: true, color: true } },
        _count: { select: { matches: true } },
      },
    }),
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: { id: true, name: true, season: true, color: true },
    }),
  ]);
  return <AdminGironiClient initialGroups={groups} teams={teams} />;
}
