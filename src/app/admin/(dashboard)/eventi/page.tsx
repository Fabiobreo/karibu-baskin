import { prisma } from "@/lib/db";
import AdminEventiClient from "@/components/admin/AdminEventiClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Eventi | Admin" };
export const revalidate = 30;

export default async function AdminEventiPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: "asc" },
    include: {
      options: {
        orderBy: [{ order: "asc" }, { startsAt: "asc" }],
        select: { id: true, label: true, startsAt: true, kind: true, order: true },
      },
    },
  });
  return (
    <>
      <AdminPageHeader
        title="Gestione Eventi"
        subtitle="Tornei, trasferte e altri eventi del club."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Eventi" }]}
      />
      <AdminEventiClient events={events} />
    </>
  );
}
