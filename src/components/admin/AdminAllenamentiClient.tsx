"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Paper,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import TrainingCloseForm, { type CloseAthlete } from "@/components/admin/TrainingCloseForm";
import SessionActions from "@/components/admin/SessionActions";
import TrainingReadOnlyDetails from "@/components/admin/TrainingReadOnlyDetails";
import type { ParticipantRegistration } from "@/components/admin/ManageParticipantsDialog";
import { closeStatus, type SavedResult } from "@/lib/trainingClose";
import type { TeamsData } from "@/lib/schemas";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export interface AdminSessionRow {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
  location: string | null;
  dateSlug: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
  athleteCount: number;
  presentCount: number;
  athletes: CloseAthlete[];
  registrations: ParticipantRegistration[];
  expectedResults: number;
  results: SavedResult[];
  teams: TeamsData | null;
}

// ── Riga chiusa: cosa manca, a colpo d'occhio ────────────────────────────────

function SessionSummary({ s, concluded }: { s: AdminSessionRow; concluded: boolean }) {
  const status = closeStatus(
    s.athletes,
    s.expectedResults,
    s.results.filter((r) => r.matchup).length
  );
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", minWidth: 0 }}>
      <Box sx={{ minWidth: 0, flex: "1 1 220px" }}>
        <Typography variant="subtitle1" component="h3">
          {s.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ "&::first-letter": { textTransform: "uppercase" } }}
        >
          {format(new Date(s.date), "EEEE d MMMM", { locale: it })} · {s.athleteCount}{" "}
          {s.athleteCount === 1 ? "iscritto" : "iscritti"}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {concluded && (
          <Chip
            size="small"
            variant="outlined"
            label={`Presenti ${s.presentCount}/${s.athleteCount} · ${s.results.length} ${s.results.length === 1 ? "risultato" : "risultati"}`}
          />
        )}
        {!concluded && status.unmarked > 0 && (
          <Chip
            size="small"
            variant="outlined"
            color="warning"
            label={`Presenze da segnare: ${status.unmarked}`}
          />
        )}
        {!concluded && status.missingResults > 0 && (
          <Chip
            size="small"
            variant="outlined"
            color="warning"
            label={
              status.missingResults === 1
                ? "1 risultato mancante"
                : `${status.missingResults} risultati mancanti`
            }
          />
        )}
        {!concluded && s.expectedResults === 0 && s.athleteCount > 0 && (
          <Chip size="small" variant="outlined" label="Squadre da creare" />
        )}
        {!concluded &&
          status.unmarked === 0 &&
          status.missingResults === 0 &&
          s.expectedResults > 0 && (
            <Chip
              size="small"
              variant="outlined"
              color="success"
              icon={<CheckCircleIcon />}
              label="Pronto da concludere"
            />
          )}
      </Box>
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Allenamenti da completare (UX-13): una riga chiusa per allenamento, se ne
 * apre una sola alla volta. Prima erano tutte card aperte: con 27 allenamenti
 * la pagina arrivava a 21.000 px su mobile.
 */
export default function AdminAllenamentiClient({
  sessions,
  variant = "toComplete",
  initialOpenId = null,
  initialEditId = null,
  readOnly = false,
}: {
  sessions: AdminSessionRow[];
  /** "concluded": gli allenamenti gia' chiusi, solo per correggere. */
  variant?: "toComplete" | "concluded";
  initialOpenId?: string | null;
  initialEditId?: string | null;
  /** Dirigente: presenze, squadre e risultati da leggere, senza il modulo di chiusura. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const concluded = variant === "concluded";
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? initialEditId);

  if (sessions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}>
        <CheckCircleIcon sx={{ fontSize: 40, color: "success.main", mb: 1 }} />
        <Typography fontWeight={FONT_WEIGHT.semibold}>
          {concluded ? "Nessun allenamento concluso" : "Tutto in ordine!"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {concluded
            ? "Gli allenamenti chiusi compariranno qui."
            : "Nessun allenamento passato richiede attenzione."}
        </Typography>
      </Paper>
    );
  }

  // Il mese e' il raggruppamento naturale; le sessioni arrivano gia' ordinate.
  const months: { key: string; label: string; items: AdminSessionRow[] }[] = [];
  for (const s of sessions) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(s);
    else months.push({ key, label: format(d, "MMMM yyyy", { locale: it }), items: [s] });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {months.map((m) => (
        <Box key={m.key}>
          <Typography
            variant="overline"
            component="h2"
            color="text.secondary"
            sx={{ display: "block", textTransform: "capitalize", mb: 1 }}
          >
            {m.label} · {m.items.length}
          </Typography>
          {m.items.map((s) => {
            const open = openId === s.id;
            return (
              <Accordion
                key={s.id}
                expanded={open}
                onChange={(_, expanded) => setOpenId(expanded ? s.id : null)}
                disableGutters
                slotProps={{ transition: { unmountOnExit: true } }}
                sx={{
                  "&::before": { display: "none" },
                  mb: 1,
                  border: "1px solid",
                  borderColor: "divider",
                }}
                elevation={0}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`chiusura-${s.id}`}
                  id={`riga-${s.id}`}
                  sx={{ minHeight: 64, "& .MuiAccordionSummary-content": { minWidth: 0 } }}
                >
                  <SessionSummary s={s} concluded={concluded} />
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {readOnly ? (
                    <TrainingReadOnlyDetails
                      sessionId={s.id}
                      athletes={s.athletes}
                      coaches={s.registrations.filter((r) => r.registeredAsCoach)}
                      teams={s.teams}
                      results={s.results}
                      past
                    />
                  ) : (
                    <>
                      <SessionActions session={s} initialEdit={initialEditId === s.id} />
                      <TrainingCloseForm
                        sessionId={s.id}
                        title={s.title}
                        date={s.date}
                        athletes={s.athletes}
                        registrations={s.registrations}
                        teams={s.teams}
                        results={s.results}
                        alreadyConcluded={concluded}
                        onSaved={(didConclude) => {
                          if (didConclude) setOpenId(null);
                          router.refresh();
                        }}
                      />
                    </>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
