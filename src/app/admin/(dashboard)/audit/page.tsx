import HistoryIcon from "@mui/icons-material/History";
import AuditLogClient from "@/components/AuditLogClient";
import AdminPageHeader from "@/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function AdminAuditPage() {
  return (
    <>
      <AdminPageHeader
        title="Registro Attività"
        subtitle="Tutte le azioni effettuate da coach e admin sul pannello."
        icon={<HistoryIcon sx={{ color: "admin.audit" }} />}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Registro attività" }]}
      />
      <AuditLogClient />
    </>
  );
}
