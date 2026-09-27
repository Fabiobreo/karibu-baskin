import { redirect } from "next/navigation";
import { Link as MuiLink, Typography } from "@mui/material";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import AdminNotificationSender from "@/components/admin/AdminNotificationSender";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avviso urgente | Admin" };

/**
 * Invio manuale di una notifica. Prima stava in fondo alla dashboard, sempre
 * aperto: e' uno strumento raro (quasi tutto parte gia' in automatico), che
 * serve per gli avvisi urgenti e mirati. Gli annunci normali passano dalle News.
 */
export default async function AdminAvvisiPage() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  return (
    <>
      <AdminPageHeader
        title="Avviso urgente"
        subtitle="Una notifica sul telefono e nel centro notifiche, per chi scegli tu."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Avviso urgente" }]}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 640 }}>
        Usalo per le cose dell&apos;ultimo momento, come una palestra chiusa o un orario cambiato.
        Per gli annunci normali scrivi una{" "}
        <MuiLink href="/admin/news" fontWeight={600}>
          news
        </MuiLink>
        : resta visibile e parte già con la sua notifica.
      </Typography>
      <AdminNotificationSender currentSeason={await getCurrentSeasonLabel()} />
    </>
  );
}
