import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminAvversarieClient from "@/components/AdminAvversarieClient";
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
  return <AdminAvversarieClient initialOpponents={opponents} />;
}
