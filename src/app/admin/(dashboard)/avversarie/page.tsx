import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/adminAccess";

/** Le avversarie sono una scheda di "Squadre": l'indirizzo vecchio porta lì. */
export default async function AdminAvversariePage() {
  // La scheda delle avversarie è dello staff: il dirigente torna alla dashboard.
  await requireAdminPage("/admin/squadre", { staffOnly: true });
  redirect("/admin/squadre?tab=avversarie");
}
