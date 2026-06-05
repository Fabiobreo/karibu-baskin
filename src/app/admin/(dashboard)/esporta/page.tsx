import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminEsportaClient from "@/components/admin/AdminEsportaClient";

export default function AdminEsportaPage() {
  return (
    <>
      <AdminPageHeader
        title="Esporta dati"
        subtitle="Scarica i dati in formato CSV, compatibile con Excel e Google Sheets."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Esporta dati" }]}
      />
      <AdminEsportaClient />
    </>
  );
}
