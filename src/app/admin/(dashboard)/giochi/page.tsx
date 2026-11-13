import { Box } from "@mui/material";
import PageHeader from "@/components/common/PageHeader";
import AdminGamesClient from "@/components/admin/AdminGamesClient";
import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import { formatRome } from "@/lib/dateUtils";
import { resolveGameSettings } from "@/lib/games/gameSettings";
import { loadGameMetrics } from "@/lib/metrics/loadGameMetrics";

// Lo stato dei giochi si legge dal database, non dalla cache del sito: qui
// conta quello appena salvato.
export const dynamic = "force-dynamic";

/** Giorni delle partite del quiz contate nella riga dei numeri. */
const QUIZ_WINDOW_DAYS = 30;

/**
 * Giochi (UX-66), solo admin: chi vede il quiz, il pronostico e la sfida fra
 * le nostre squadre. I numeri sono gli stessi di "Metriche", per curiosità.
 */
export default async function AdminGiochiPage() {
  await requireAdminPage("/admin/giochi");
  const [rows, metrics, quizzes] = await Promise.all([
    prisma.gameSetting.findMany({ select: { game: true, visibility: true } }),
    loadGameMetrics(QUIZ_WINDOW_DAYS),
    prisma.quiz.findMany({ select: { visibility: true } }),
  ]);
  const on = quizzes.filter((q) => q.visibility !== "OFF").length;
  const last = metrics.predictions[0];
  const numbers = {
    quiz: `${quizzes.length} quiz, ${on} ${on === 1 ? "acceso" : "accesi"} · partite negli ultimi ${QUIZ_WINDOW_DAYS} giorni: ${metrics.quizPlays}`,
    prediction: last
      ? `Ultima partita, ${last.title} del ${formatRome(last.date, "d/M")}: ${last.count} pronostici`
      : "Ancora nessuna partita giocata con il pronostico",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Giochi"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Giochi" }]}
      />
      <AdminGamesClient initialSettings={resolveGameSettings(rows)} numbers={numbers} />
    </Box>
  );
}
