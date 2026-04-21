import { prisma } from "@/lib/db";
import AdminAllenamentiClient from "@/components/AdminAllenamentiClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Allenamenti | Admin" };
export const revalidate = 0;

export default async function AdminAllenamentiPage() {
  const sessions = await prisma.trainingSession.findMany({
    orderBy: { date: "asc" },
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
  });

  return <AdminAllenamentiClient initialSessions={sessions} />;
}
