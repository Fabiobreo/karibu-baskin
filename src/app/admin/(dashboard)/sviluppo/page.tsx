import { Paper, Typography } from "@mui/material";
import { requireAdminPage } from "@/lib/adminAccess";
import PageHeader from "@/components/common/PageHeader";
import DevelopmentTracker from "@/components/rating/DevelopmentTracker";
import { loadDevelopmentTracker } from "@/lib/rating/developmentData";

export const revalidate = 60;

export default async function SviluppoPage() {
  await requireAdminPage("/admin/sviluppo");

  const { athletes, summary } = await loadDevelopmentTracker();

  return (
    <>
      <PageHeader
        title="Sviluppo giocatori"
        subtitle="Come cambia nel tempo il livello stimato di ogni giocatore. Lo vede solo lo staff."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Sviluppo" }]}
      />
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        {athletes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            Nessun livello stimato: servono partitelle con il punteggio registrato.
          </Typography>
        ) : (
          <DevelopmentTracker athletes={athletes} summary={summary} />
        )}
      </Paper>
    </>
  );
}
