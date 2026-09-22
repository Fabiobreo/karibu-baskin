import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminNuovoFiglioClient from "@/components/admin/AdminNuovoFiglioClient";
import type { AdminPerson } from "@/components/admin/people/usePeopleSearch";

export const metadata: Metadata = { title: "Nuovo figlio | Admin" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// ?parentId=… arriva dal dettaglio di un utente ("Aggiungi un figlio"): il
// genitore è già scelto e si parte dal nome del figlio.
export default async function NuovoFiglioPage({ searchParams }: { searchParams: SearchParams }) {
  const { parentId } = await searchParams;
  const parent =
    typeof parentId === "string"
      ? await prisma.user.findUnique({
          where: { id: parentId },
          select: {
            id: true,
            name: true,
            email: true,
            appRole: true,
            sportRole: true,
            image: true,
            customImage: true,
          },
        })
      : null;

  const initialParent: AdminPerson | null = parent
    ? {
        kind: "user",
        id: parent.id,
        name: parent.name?.trim() || parent.email,
        email: parent.email,
        appRole: parent.appRole,
        sportRole: parent.sportRole,
        image: parent.customImage ?? parent.image ?? null,
        parentName: null,
        guardianIds: [],
      }
    : null;

  return (
    <>
      <AdminPageHeader
        title="Nuovo figlio"
        subtitle="Per chi non ha un account: il genitore lo ritroverà nel suo profilo e potrà iscriverlo agli allenamenti."
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Utenti", href: "/admin/utenti" },
          { label: "Nuovo figlio" },
        ]}
      />
      <AdminNuovoFiglioClient initialParent={initialParent} />
    </>
  );
}
