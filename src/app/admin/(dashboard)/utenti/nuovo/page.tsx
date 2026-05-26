import AdminPageHeader from "@/components/AdminPageHeader";
import AdminNuovoUtenteClient from "@/components/AdminNuovoUtenteClient";

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
