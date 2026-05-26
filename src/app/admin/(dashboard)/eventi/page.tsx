import { prisma } from "@/lib/db";
import AdminEventiClient from "@/components/AdminEventiClient";
import AdminPageHeader from "@/components/AdminPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Eventi | Admin" };
export const revalidate = 30;

export default async function AdminEventiPage() {
  const events = await prisma.event.findMany({ orderBy: { date: "asc" } });
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
