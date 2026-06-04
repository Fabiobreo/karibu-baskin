import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminSuggerimentiClient from "@/components/AdminSuggerimentiClient";
import AdminPageHeader from "@/components/AdminPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Suggerimenti | Admin" };
export const revalidate = 0;

export default async function AdminSuggerimentiPage() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  // NB: userId/user del suggerimento volutamente esclusi — i suggerimenti sono
  // anonimi verso lo staff. L'autore delle note (staff) invece è visibile.
  const suggestions = await prisma.suggestion.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      notes: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true, customImage: true } },
        },
      },
    },
  });
  return (
    <>
      <AdminPageHeader
        title="Suggerimenti"
        subtitle="Le proposte inviate (in forma anonima) dagli utenti registrati."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Suggerimenti" }]}
      />
      <AdminSuggerimentiClient
        currentUserId={session.user.id}
        isAdmin={session.user.appRole === "ADMIN"}
        initialSuggestions={suggestions.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          notes: s.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
        }))}
      />
    </>
  );
}
