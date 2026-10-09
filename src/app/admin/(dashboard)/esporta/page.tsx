import PageHeader from "@/components/common/PageHeader";
import AdminEsportaClient from "@/components/admin/AdminEsportaClient";
import { requireAdminPage } from "@/lib/adminAccess";

export default async function AdminEsportaPage() {
  await requireAdminPage("/admin/esporta");
  return (
    <>
      <PageHeader
        title="Esporta dati"
        subtitle="Scarica i dati in formato CSV, compatibile con Excel e Google Sheets."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Esporta dati" }]}
      />
      <AdminEsportaClient />
    </>
  );
}
