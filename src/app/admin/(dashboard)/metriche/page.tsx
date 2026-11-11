import { Box } from "@mui/material";
import PageHeader from "@/components/common/PageHeader";
import MetricTile, { MetricSection } from "@/components/admin/MetricTile";
import EngagementSection from "@/components/admin/EngagementSection";
import {
  ACTIVE_WINDOW_DAYS,
  METRICS_WINDOW_DAYS,
  loadAdminMetrics,
} from "@/lib/metrics/loadAdminMetrics";
import { loadEngagementMetrics } from "@/lib/metrics/loadEngagementMetrics";
import { requireAdminPage } from "@/lib/adminAccess";
import { num, pct } from "@/lib/metrics/formatMetric";

// Metriche sempre fresche: sono poche query aggregate, e un numero vecchio di
// mezz'ora sarebbe più confuso che utile.
export const dynamic = "force-dynamic";

/**
 * Metriche d'uso (KB-32). Calcolate dai dati del gestionale, senza tracciare
 * nulla in più: vedi @/lib/metrics/adminMetrics.
 */
export default async function AdminMetrichePage() {
  // Le tessere che portano a un lavoro da fare sono link solo per lo staff.
  const { readOnly } = await requireAdminPage("/admin/metriche");
  const [m, engagement] = await Promise.all([loadAdminMetrics(), loadEngagementMetrics()]);
  const { community: c, training: t, matches: p, engagement: e } = m;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Metriche"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Metriche" }]}
      />

      <EngagementSection data={engagement} />

      <MetricSection title="Comunità">
        <MetricTile
          value={String(c.activeUsers)}
          label={`Attivi negli ultimi ${ACTIVE_WINDOW_DAYS} giorni`}
          caption={`Su ${c.members} tesserati con account. Conta chi ha aperto l'app da loggato.`}
        />
        <MetricTile
          value={String(c.children)}
          label="Figli gestiti dai genitori"
          caption={`${c.childrenWithAccount} con un account proprio collegato.`}
        />
        <MetricTile
          value={pct(c.pushRate)}
          label="Tesserati con notifiche push"
          caption="Almeno un dispositivo iscritto: chi non c'è riceve solo le notifiche in app."
        />
        <MetricTile
          value={String(c.guestsWaiting)}
          label="Account in attesa di ruolo"
          caption="Ancora ospiti: non vedono rose e iscritti finché lo staff non assegna un ruolo."
          href={readOnly ? undefined : "/admin/utenti"}
          highlight={c.guestsWaiting > 0}
        />
      </MetricSection>

      <MetricSection
        title={`Allenamenti (${t.sessions} negli ultimi ${METRICS_WINDOW_DAYS} giorni)`}
      >
        <MetricTile
          value={num(t.avgAthletes)}
          label="Atleti iscritti per allenamento"
          caption="Media; gli allenatori iscritti come tali non contano."
        />
        <MetricTile
          value={pct(t.attendanceRate)}
          label="Presenza effettiva"
          caption="Presenti sugli iscritti di cui è stata segnata la presenza."
        />
        <MetricTile
          value={pct(t.within24hRate)}
          label="Iscrizioni entro 24 ore dall'apertura"
          caption="Misura se l'avviso di apertura arriva e viene letto."
        />
        <MetricTile
          value={pct(t.anonymousRate)}
          label="Iscrizioni senza account"
          caption="Persone che si iscrivono senza accedere: non ricevono promemoria né notifiche."
        />
        <MetricTile
          value={pct(t.concludedWithin48hRate)}
          label="Chiusi entro 48 ore"
          caption="Allenamenti con presenze e partitelle registrate entro due giorni."
          href={readOnly ? undefined : "/admin/allenamenti"}
        />
      </MetricSection>

      <MetricSection title={`Partite (${p.matches} negli ultimi ${METRICS_WINDOW_DAYS} giorni)`}>
        <MetricTile
          value={pct(p.responseRate)}
          label="Disponibilità dichiarate"
          caption="Risposte sui membri della squadra di ogni partita."
        />
        <MetricTile
          value={p.medianLeadDays === null ? "n.d." : `${num(p.medianLeadDays)} gg`}
          label="Anticipo mediano della risposta"
          caption="Quanti giorni prima della partita arriva la disponibilità. Il promemoria parte 14 giorni prima."
        />
      </MetricSection>

      <MetricSection title={`Sondaggi ed eventi (ultimi ${METRICS_WINDOW_DAYS} giorni)`}>
        <MetricTile
          value={String(e.pollVoters)}
          label="Persone che hanno votato un sondaggio"
          caption={`${e.pollVotes} voti in totale.`}
        />
        <MetricTile
          value={String(e.eventResponses)}
          label="Risposte agli eventi"
          caption="Ci sarò, forse o no, sugli eventi del periodo."
        />
      </MetricSection>
    </Box>
  );
}
