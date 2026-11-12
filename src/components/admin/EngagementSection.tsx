import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import MetricTile, { MetricSection } from "@/components/admin/MetricTile";
import {
  ACTIVITY_HISTORY_WEEKS,
  AVAILABILITY_WINDOW_DAYS,
  NOTIFICATION_WINDOW_DAYS,
  REGISTRATION_WINDOW_DAYS,
  SHARE_WINDOW_DAYS,
  type EngagementSection as EngagementData,
  type WeeklyActivityPoint,
} from "@/lib/metrics/loadEngagementMetrics";
import {
  NO_COMPARISON,
  countDelta,
  duration,
  durationDelta,
  pct,
  rateDelta,
} from "@/lib/metrics/formatMetric";
import { RADIUS } from "@/lib/radius";

/** Nomi dei tipi di notifica per lo staff (admin solo in italiano). */
const TYPE_LABEL: Record<string, string> = {
  NEW_TRAINING: "Allenamenti",
  TEAMS_READY: "Squadre degli allenamenti",
  MATCH_RESULT: "Risultati e statistiche",
  SYSTEM: "Promemoria e avvisi",
  LINK_REQUEST: "Richieste di collegamento",
  LINK_RESPONSE: "Risposte ai collegamenti",
  BIRTHDAY: "Compleanni",
  NEW_POST: "News",
  NEW_POLL: "Sondaggi",
  BADGE_UNLOCKED: "Traguardi",
  NEW_EVENT: "Eventi",
  MATCH_CALLUP: "Convocazioni",
  MATCH_AVAILABILITY: "Disponibilità",
  SUGGESTION: "Suggerimenti",
  ALBUM_PUBLISHED: "Nuove foto",
  SEASON_RECAP: "La tua stagione",
  TEST: "Notifica di prova",
};

/** Cosa si è condiviso (campagne di `@/lib/shareLinks`), per lo staff. */
const SHARE_LABEL: Record<string, string> = {
  tabellino: "Immagine del risultato",
  convocati: "Immagine dei convocati",
  squadre: "Immagine delle squadre",
  allenamento: "Allenamento",
  evento: "Evento",
  partita: "Partita",
  news: "News",
  album: "Album foto",
  profilo: "Profilo giocatore",
  traguardo: "Immagine di un traguardo",
  stagione: 'Immagine "La tua stagione"',
};

const dayMonth = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
});

interface EngagementSectionProps {
  data: EngagementData;
}

/**
 * "Coinvolgimento" in `/admin/metriche` (UX-55): famiglie attive, risposte
 * alle disponibilità, iscrizioni fatte da sé, da contatto a tesserato,
 * aperture delle notifiche. Ogni numero ha il confronto con quattro settimane
 * prima, scritto e neutro.
 */
export default function EngagementSection({ data }: EngagementSectionProps) {
  const { families: f, availability: a, registrations: r, funnel: g } = data;
  const fc = f.current;

  return (
    <>
      <MetricSection title="Coinvolgimento">
        <MetricTile
          value={pct(fc?.rate ?? null)}
          label="Famiglie attive negli ultimi 7 giorni"
          delta={f.previous ? rateDelta(fc?.rate ?? null, f.previous.rate) : NO_COMPARISON}
          caption={`${fc?.activeFamilies ?? 0} famiglie su ${fc?.families ?? 0}. Una famiglia sono i genitori e i figli collegati: se uno di loro apre l'app da loggato, la famiglia è attiva.`}
        />
        <MetricTile
          value={pct(a.current.answeredBeforeCallupRate)}
          label="Rosa che risponde prima delle convocazioni"
          delta={rateDelta(a.current.answeredBeforeCallupRate, a.previous.answeredBeforeCallupRate)}
          caption={`Partite delle ultime ${AVAILABILITY_WINDOW_DAYS / 7} settimane (${a.current.matches}). Non contano le risposte segnate dallo staff.`}
        />
        <MetricTile
          value={duration(a.current.medianResponseHours)}
          label="Tempo per rispondere alla disponibilità"
          delta={durationDelta(a.current.medianResponseHours, a.previous.medianResponseHours)}
          caption="Mediana dal momento in cui si può rispondere (la partita inserita, o 14 giorni prima se inserita molto prima) alla risposta."
        />
        <MetricTile
          value={pct(r.current.selfRate)}
          label="Iscrizioni fatte dalle famiglie"
          delta={rateDelta(r.current.selfRate, r.previous.selfRate)}
          caption={`Allenamenti delle ultime ${REGISTRATION_WINDOW_DAYS / 7} settimane: ${r.current.total} iscrizioni, ${r.current.byStaff} aggiunte dallo staff. Più è alta, più le famiglie usano l'app invece di scrivere all'allenatore.`}
        />
        <MetricTile
          value={`${g.current.created} → ${g.current.trained} → ${g.current.converted}`}
          label="Da contatto a tesserato (6 mesi)"
          delta={`Tesserati: ${countDelta(g.current.converted, g.previous.converted).toLowerCase()}`}
          caption={`Account ospiti creati → con almeno un allenamento da ospiti → diventati atleti o genitori. Giorni mediani: ${days(g.current.medianDaysToTraining)} fino al primo allenamento, ${days(g.current.medianDaysToConversion)} da lì al tesseramento.`}
        />
        <MetricTile
          value={pct(data.pushOpenRate.current)}
          label="Notifiche push aperte"
          delta={rateDelta(data.pushOpenRate.current, data.pushOpenRate.previous)}
          caption={`Ultimi ${NOTIFICATION_WINDOW_DAYS} giorni, tutti i tipi. Il dettaglio per tipo è qui sotto.`}
        />
        <MetricTile
          value={String(data.shares.total)}
          label="Visite dalle condivisioni"
          delta={countDelta(data.shares.total, data.shares.previousTotal)}
          caption={`Ultimi ${SHARE_WINDOW_DAYS} giorni: persone arrivate sul sito toccando un link mandato con i bottoni "Condividi". Il dettaglio è qui sotto.`}
        />
      </MetricSection>

      <WeeklyChart points={data.weekly} />
      <NotificationTable rows={data.notifications} />
      <ShareTable rows={data.shares.byCampaign} />
    </>
  );
}

function days(v: number | null): string {
  if (v === null) return "n.d.";
  const n = Math.round(v * 10) / 10;
  return `${n.toLocaleString("it-IT")} gg`;
}

const WEEKLY_NOTE = `Ultime ${ACTIVITY_HISTORY_WEEKS} settimane. Ogni domenica il sito salva il conteggio della settimana: dalle sessioni si sa solo l'ultimo accesso, quindi una settimana passata non si ricostruisce, e lo storico parte dalla prima domenica dopo l'attivazione.`;

function WeeklyChart({ points }: { points: WeeklyActivityPoint[] }) {
  const summary = points
    .map(
      (p) =>
        `${p.live ? "ultimi 7 giorni" : `settimana al ${dayMonth.format(p.weekEnd)}`}: ${pct(p.rate)}`
    )
    .join("; ");
  return (
    <Paper elevation={1} sx={{ p: 2.5 }} component="section" aria-labelledby="weekly-families">
      <Typography id="weekly-families" variant="subtitle2" component="h3">
        Famiglie attive, settimana per settimana
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        {WEEKLY_NOTE}
      </Typography>
      <Box
        role="img"
        aria-label={`Quota di famiglie attive per settimana. ${summary}`}
        sx={{ display: "flex", alignItems: "flex-end", gap: 1, height: 140 }}
      >
        {points.map((p) => (
          <Box
            key={p.weekEnd.toISOString()}
            aria-hidden
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <Typography variant="caption" sx={{ color: "text.primary", whiteSpace: "nowrap" }}>
              {pct(p.rate)}
            </Typography>
            <Box
              sx={{
                width: "100%",
                maxWidth: 40,
                height: `${Math.max(2, Math.round((p.rate ?? 0) * 100))}%`,
                // Neutro (UX-29): la settimana in corso piena, le altre più chiare.
                bgcolor: p.live ? "text.primary" : "text.secondary",
                opacity: p.live ? 1 : 0.55,
                borderRadius: RADIUS.sm,
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap", mt: 0.5 }}
            >
              {p.live ? "Oggi" : dayMonth.format(p.weekEnd)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function NotificationTable({ rows }: { rows: EngagementData["notifications"] }) {
  return (
    <Paper elevation={1} sx={{ p: 2.5 }} component="section" aria-labelledby="notif-opens">
      <Typography id="notif-opens" variant="subtitle2" component="h3">
        Aperture delle notifiche per tipo (ultimi {NOTIFICATION_WINDOW_DAYS} giorni)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Dalla quota di push aperte più bassa: in cima le candidate da tagliare. &ldquo;Lette
        nell&apos;app&rdquo; misura un&apos;altra cosa: le notifiche indirizzate a una persona e
        lette dalla campanella o dalla pagina Notifiche.
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nessuna notifica nel periodo.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Push inviate</TableCell>
                <TableCell align="right">Push aperte</TableCell>
                <TableCell align="right">Quota</TableCell>
                <TableCell align="right">Lette nell&apos;app</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.type}>
                  <TableCell component="th" scope="row">
                    {TYPE_LABEL[row.type] ?? row.type}
                  </TableCell>
                  <TableCell align="right">{row.pushSent}</TableCell>
                  <TableCell align="right">{row.pushOpened}</TableCell>
                  <TableCell align="right">{pct(row.pushRate)}</TableCell>
                  <TableCell align="right">
                    {row.inAppSent > 0 ? `${pct(row.inAppRate)} di ${row.inAppSent}` : "n.d."}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Le aperture sono sottostimate: su iOS e su alcuni Android una notifica aperta toccando il
        gruppo, o con il telefono senza rete, non viene contata. Il numero serve a confrontare i
        tipi fra loro, non come valore assoluto. Il sito conta solo quante, mai chi.
      </Typography>
    </Paper>
  );
}

function ShareTable({ rows }: { rows: EngagementData["shares"]["byCampaign"] }) {
  return (
    <Paper elevation={1} sx={{ p: 2.5 }} component="section" aria-labelledby="share-visits">
      <Typography id="share-visits" variant="subtitle2" component="h3">
        Visite dalle condivisioni per cosa si è condiviso (ultimi {SHARE_WINDOW_DAYS} giorni)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        &ldquo;Messaggio&rdquo; è il link partito con WhatsApp o con il foglio di condivisione del
        telefono, &ldquo;Copia link&rdquo; quello copiato e incollato altrove, &ldquo;QR&rdquo;
        quello inquadrato.
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nessuna visita da una condivisione nel periodo.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cosa</TableCell>
                <TableCell align="right">Visite</TableCell>
                <TableCell align="right">Messaggio</TableCell>
                <TableCell align="right">Copia link</TableCell>
                <TableCell align="right">QR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.campaign}>
                  <TableCell component="th" scope="row">
                    {SHARE_LABEL[row.campaign] ?? row.campaign}
                  </TableCell>
                  <TableCell align="right">{row.total}</TableCell>
                  <TableCell align="right">{row.whatsapp}</TableCell>
                  <TableCell align="right">{row.link}</TableCell>
                  <TableCell align="right">{row.qr}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Si conta una visita per scheda del browser; chi guarda solo l&apos;anteprima in WhatsApp,
        senza toccarla, non conta. Il sito conta solo quante, mai chi.
      </Typography>
    </Paper>
  );
}
