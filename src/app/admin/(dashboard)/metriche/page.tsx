import Link from "next/link";
import { Box, Paper, Typography } from "@mui/material";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  ACTIVE_WINDOW_DAYS,
  METRICS_WINDOW_DAYS,
  loadAdminMetrics,
} from "@/lib/metrics/loadAdminMetrics";

// Metriche sempre fresche: sono poche query aggregate, e un numero vecchio di
// mezz'ora sarebbe più confuso che utile.
export const dynamic = "force-dynamic";

const percent = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

// "n.d." e non "0%": senza dati il rapporto non è misurabile, non è nullo.
const pct = (v: number | null) => (v === null ? "n.d." : percent.format(v));
const num = (v: number | null) => (v === null ? "n.d." : decimal.format(v));

/**
 * Metriche d'uso (KB-32). Calcolate dai dati del gestionale, senza tracciare
 * nulla in più: vedi @/lib/metrics/adminMetrics.
 */
export default async function AdminMetrichePage() {
  const m = await loadAdminMetrics();
  const { community: c, training: t, matches: p, engagement: e } = m;

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <AdminPageHeader
        title="Metriche"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Metriche" }]}
      />

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
          href="/admin/utenti"
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
          href="/admin/allenamenti"
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

      <MetricSection title={`Coinvolgimento (ultimi ${METRICS_WINDOW_DAYS} giorni)`}>
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

function MetricSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section">
      <Typography
        variant="overline"
        component="h2"
        sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: 1, display: "block", mb: 1 }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function MetricTile({
  value,
  label,
  caption,
  href,
  highlight,
}: {
  value: string;
  label: string;
  caption: string;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <Paper
      elevation={1}
      sx={{
        p: 2.5,
        height: "100%",
        border: "2px solid",
        borderColor: highlight ? "admin.tools" : "transparent",
      }}
    >
      <Typography
        component="p"
        sx={{
          fontSize: "2rem",
          fontWeight: 900,
          lineHeight: 1,
          color: "admin.tools",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.75 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        {caption}
      </Typography>
    </Paper>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {body}
    </Link>
  ) : (
    body
  );
}
