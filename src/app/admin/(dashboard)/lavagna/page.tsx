import AdminDrillListClient from "@/components/admin/board/AdminDrillListClient";
import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import { DRILL_ADMIN_SELECT, loadDrillTeamOptions, toAdminDrillRow } from "@/lib/board/drillAdmin";
import { EMPTY_DRILL_CONTENT, parseDrillContent } from "@/lib/schemas/drill";

export const dynamic = "force-dynamic";

/** Lavagna (UX-72): gli schemi ed esercizi dello staff. Il dirigente li guarda. */
export default async function AdminLavagnaPage() {
  const { readOnly } = await requireAdminPage("/admin/lavagna");
  const [drills, teams] = await Promise.all([
    prisma.drill.findMany({ orderBy: { updatedAt: "desc" }, select: DRILL_ADMIN_SELECT }),
    loadDrillTeamOptions(),
  ]);
  return (
    <AdminDrillListClient
      readOnly={readOnly}
      teams={teams}
      drills={drills.map((d) => ({
        ...toAdminDrillRow(d),
        // Un disegno illeggibile (non dovrebbe capitare) non rompe l'elenco.
        content: parseDrillContent(d.content, d.court) ?? EMPTY_DRILL_CONTENT,
      }))}
    />
  );
}
