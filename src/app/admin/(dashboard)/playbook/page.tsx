import AdminDrillListClient from "@/components/admin/board/AdminDrillListClient";
import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import { DRILL_ADMIN_SELECT, loadDrillTeamOptions, toAdminDrillRow } from "@/lib/board/drillAdmin";
import { EMPTY_DRILL_CONTENT, parseDrillContent } from "@/lib/schemas/drill";

export const dynamic = "force-dynamic";

/** Playbook (UX-72): esercizi e schemi dello staff. Il dirigente li guarda. */
export default async function AdminPlaybookPage() {
  const { readOnly } = await requireAdminPage("/admin/playbook");
  const [drills, teams] = await Promise.all([
    prisma.drill.findMany({
      where: { status: { not: "PROPOSED" } },
      orderBy: { updatedAt: "desc" },
      select: DRILL_ADMIN_SELECT,
    }),
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
