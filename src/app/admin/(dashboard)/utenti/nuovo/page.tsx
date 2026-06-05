import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminNuovoUtenteClient from "@/components/admin/AdminNuovoUtenteClient";

export default function NuovoUtentePage() {
  return (
    <>
      <AdminPageHeader
        title="Nuovo utente"
        subtitle="L'utente potrà accedere con Google usando la stessa email — l'account si collegherà automaticamente."
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
