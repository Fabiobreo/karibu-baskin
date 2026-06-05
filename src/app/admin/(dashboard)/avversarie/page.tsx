import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminAvversarieClient from "@/components/admin/AdminAvversarieClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Squadre avversarie | Admin" };
export const revalidate = 30;

export default async function AdminAvversariePage() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  const opponents = await prisma.opposingTeam.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      address: true,
      website: true,
      colors: true,
    },
  });
  return (
    <>
      <AdminPageHeader
        title="Squadre avversarie"
        subtitle="Anagrafica delle squadre che incontriamo nei campionati e nei tornei."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Avversarie" }]}
      />
      <AdminAvversarieClient initialOpponents={opponents} />
    </>
  );
}
