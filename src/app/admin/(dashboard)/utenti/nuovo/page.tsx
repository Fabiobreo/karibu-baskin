import PageHeader from "@/components/common/PageHeader";
import AdminNuovoUtenteClient from "@/components/admin/AdminNuovoUtenteClient";
import { requireAdminPage } from "@/lib/adminAccess";

export default async function NuovoUtentePage() {
  await requireAdminPage("/admin/utenti", { staffOnly: true });
  return (
    <>
      <PageHeader
        title="Nuovo utente"
        subtitle="L'utente potrà accedere con Google usando la stessa email: l'account si collegherà automaticamente."
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Utenti", href: "/admin/utenti" },
          { label: "Nuovo utente" },
        ]}
      />
      <AdminNuovoUtenteClient />
    </>
  );
}
