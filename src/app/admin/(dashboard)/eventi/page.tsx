import { prisma } from "@/lib/db";
import AdminEventiClient from "@/components/AdminEventiClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Eventi | Admin" };
export const revalidate = 30;

export default async function AdminEventiPage() {
  const events = await prisma.event.findMany({ orderBy: { date: "asc" } });
  return <AdminEventiClient events={events} />;
}
