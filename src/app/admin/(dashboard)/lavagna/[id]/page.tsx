import { notFound } from "next/navigation";
import { Alert, Box, Typography } from "@mui/material";
import PageHeader from "@/components/common/PageHeader";
import DrillPlayer from "@/components/board/DrillPlayer";
import DrillEditor from "@/components/admin/board/DrillEditor";
import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import { DRILL_ADMIN_SELECT, loadDrillTeamOptions, toAdminDrillRow } from "@/lib/board/drillAdmin";
import { DRILL_COURT_LABELS, DRILL_KIND_LABELS } from "@/lib/board/labels";
import { EMPTY_DRILL_CONTENT, parseDrillContent } from "@/lib/schemas/drill";

export const dynamic = "force-dynamic";

/**
 * Uno schema della lavagna (UX-72): l'editor per lo staff; per il dirigente,
 * e per uno schema archiviato, solo il visore.
 */
export default async function AdminDrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { readOnly } = await requireAdminPage("/admin/lavagna");
  const { id } = await params;
  const [drill, teams] = await Promise.all([
    prisma.drill.findUnique({ where: { id }, select: DRILL_ADMIN_SELECT }),
    loadDrillTeamOptions(),
  ]);
  if (!drill) notFound();

  const row = toAdminDrillRow(drill);
  const content = parseDrillContent(drill.content, drill.court) ?? EMPTY_DRILL_CONTENT;

  if (readOnly || row.archived) {
    return (
      <>
        <PageHeader
          title={row.title}
          breadcrumb={[{ label: "Lavagna", href: "/admin/lavagna" }, { label: row.title }]}
          subtitle={`${DRILL_KIND_LABELS[row.kind]} · ${DRILL_COURT_LABELS[row.court]}`}
        />
        {row.archived && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Schema archiviato: resta negli allenamenti in cui è stato usato e non si modifica più.
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
