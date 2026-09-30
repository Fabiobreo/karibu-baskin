import PageHeader from "@/components/common/PageHeader";
import AdminEsportaClient from "@/components/admin/AdminEsportaClient";

export default function AdminEsportaPage() {
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
