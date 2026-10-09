import AuditLogClient from "@/components/admin/AuditLogClient";
import PageHeader from "@/components/common/PageHeader";
import { requireAdminPage } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdminPage("/admin/audit");
  return (
    <>
      <PageHeader
        title="Registro attività"
        subtitle="Tutte le azioni effettuate da coach e admin sul pannello."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Registro attività" }]}
      />
      <AuditLogClient />
    </>
  );
}
