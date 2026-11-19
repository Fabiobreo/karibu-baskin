import { notFound, redirect } from "next/navigation";
import { Alert, Box, Typography } from "@mui/material";
import PageHeader from "@/components/common/PageHeader";
import DrillPlayer from "@/components/board/DrillPlayer";
import DrillEditor from "@/components/admin/board/DrillEditor";
import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import { DRILL_ADMIN_SELECT, loadDrillTeamOptions, toAdminDrillRow } from "@/lib/board/drillAdmin";
import { DRILL_COURT_LABELS, DRILL_KIND_LABELS } from "@/lib/board/labels";
import { adminProposalPath } from "@/lib/board/proposals";
import { EMPTY_DRILL_CONTENT, parseDrillContent } from "@/lib/schemas/drill";

export const dynamic = "force-dynamic";

/**
 * Un esercizio o uno schema del Playbook (UX-72): l'editor per lo staff; per il dirigente,
 * e per uno archiviato, solo il visore.
 */
export default async function AdminDrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { readOnly } = await requireAdminPage("/admin/playbook");
  const { id } = await params;
  const [drill, teams] = await Promise.all([
    prisma.drill.findUnique({ where: { id }, select: DRILL_ADMIN_SELECT }),
    loadDrillTeamOptions(),
  ]);
  if (!drill) notFound();
  // Una proposta di un tesserato (UX-73) si guarda dalla sua pagina; la bozza
  // non ancora inviata e' solo dell'autore.
  if (drill.status === "PROPOSED") {
    if (!drill.proposedAt) notFound();
    redirect(adminProposalPath(drill.id));
  }

  const row = toAdminDrillRow(drill);
  const content = parseDrillContent(drill.content, drill.court) ?? EMPTY_DRILL_CONTENT;

  if (readOnly || row.archived) {
    return (
      <>
        <PageHeader
          title={row.title}
          breadcrumb={[{ label: "Playbook", href: "/admin/playbook" }, { label: row.title }]}
          subtitle={`${DRILL_KIND_LABELS[row.kind]} · ${DRILL_COURT_LABELS[row.court]}`}
        />
        {row.archived && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Archiviato: resta negli allenamenti in cui è stato usato e non si modifica più.
          </Alert>
        )}
        <Box sx={{ maxWidth: 880 }}>
          {row.description && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              {row.description}
            </Typography>
          )}
          <DrillPlayer title={row.title} court={row.court} content={content} />
        </Box>
      </>
    );
  }

  return <DrillEditor drill={row} content={content} teams={teams} />;
}
