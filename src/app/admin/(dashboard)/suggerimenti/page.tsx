import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/authRoles";
import AdminSuggerimentiClient from "@/components/admin/AdminSuggerimentiClient";
import PageHeader from "@/components/common/PageHeader";
import {
  ADMIN_SUGGESTION_SELECT,
  sortByActivity,
  toAdminSuggestion,
} from "@/lib/suggestions/adminSuggestion";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Suggerimenti | Admin" };
export const revalidate = 0;

export default async function AdminSuggerimentiPage() {
  const { session } = await requireAdminPage("/admin/suggerimenti");
  // `toAdminSuggestion` toglie `userId`: i suggerimenti sono anonimi verso lo
  // staff. L'autore delle note (staff) invece è visibile.
  const rows = await prisma.suggestion.findMany({
    orderBy: { createdAt: "desc" },
    select: ADMIN_SUGGESTION_SELECT,
  });
  return (
    <>
      <PageHeader
        title="Suggerimenti"
        subtitle="Le proposte di chi usa l'app. Non vedi chi le ha scritte, ma puoi rispondergli."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Suggerimenti" }]}
      />
      <AdminSuggerimentiClient
        currentUserId={session.user.id}
        isAdmin={hasRole(session.user.appRole, "ADMIN")}
        initialSuggestions={sortByActivity(rows.map(toAdminSuggestion))}
      />
    </>
  );
}
