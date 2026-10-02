import HistoryIcon from "@mui/icons-material/History";
import AuditLogClient from "@/components/admin/AuditLogClient";
import PageHeader from "@/components/common/PageHeader";

export const dynamic = "force-dynamic";

export default function AdminAuditPage() {
  return (
    <>
      <PageHeader
        title="Registro attività"
        subtitle="Tutte le azioni effettuate da coach e admin sul pannello."
        icon={<HistoryIcon sx={{ color: "text.secondary" }} />}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Registro attività" }]}
      />
      <AuditLogClient />
    </>
  );
}
