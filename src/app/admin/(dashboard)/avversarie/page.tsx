import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import AdminAvversarieClient from "@/components/admin/AdminAvversarieClient";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Squadre avversarie | Admin" };
export const revalidate = 30;

export default async function AdminAvversariePage() {
  await requireAdminPage("/admin/avversarie");
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
      imageUrl: true,
    },
  });
  return (
    <>
      <PageHeader
        title="Squadre avversarie"
        subtitle="Anagrafica delle squadre che incontriamo nei campionati e nei tornei."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Avversarie" }]}
      />
      <AdminAvversarieClient initialOpponents={opponents} />
    </>
  );
}
