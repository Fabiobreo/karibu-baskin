"use client";
import { Box, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import RoleBadge from "@/components/common/RoleBadge";
import TeamDisplay, { type TeamsData } from "@/components/training/TeamDisplay";
import { TEAM_META } from "@/lib/constants";
import type { Attended, SavedResult } from "@/lib/trainingClose";

export interface ReadOnlyAthlete {
  id: string;
  name: string;
  role: number;
  attended?: Attended;
}

interface TrainingReadOnlyDetailsProps {
  sessionId: string;
  athletes: ReadOnlyAthlete[];
  coaches: { id: string; name: string }[];
  teams: TeamsData | null;
  /** Allenamento passato: accanto a ogni nome c'è la presenza. */
  past?: boolean;
  /** Stato delle iscrizioni, per un allenamento futuro ("Iscrizioni aperte"). */
  registrationLabel?: string;
  results?: SavedResult[];
}

const MATCHUP_TEAMS: Record<string, [number, number]> = {
  AB: [0, 1],
  AC: [0, 2],
  BC: [1, 2],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section">
      <Typography variant="subtitle1" component="h3" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** Presenza di un atleta: icona e parola, mai solo il colore. */
function Attendance({ attended }: { attended: Attended | undefined }) {
  if (attended == null) {
    return (
      <Typography variant="body2" color="text.secondary">
        Non segnato
      </Typography>
    );
  }
  const Icon = attended ? CheckIcon : CloseIcon;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Icon fontSize="small" sx={{ color: attended ? "success.main" : "error.main" }} />
      <Typography variant="body2">{attended ? "Presente" : "Assente"}</Typography>
    </Box>
  );
}

/**
 * Un allenamento come lo legge il dirigente: iscritti (con la presenza, se è
 * passato), squadre e risultati delle partitelle. Nessun comando: gestire un
 * allenamento resta dello staff (`AdminUpcomingList`, `TrainingCloseForm`).
 */
export default function TrainingReadOnlyDetails({
  sessionId,
  athletes,
  coaches,
  teams,
  past = false,
  registrationLabel,
  results = [],
}: TrainingReadOnlyDetailsProps) {
  const played = results.filter((r) => r.matchup && MATCHUP_TEAMS[r.matchup]);
  const present = athletes.filter((a) => a.attended === true).length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Section
        title={
          past ? `Presenze · ${present} su ${athletes.length}` : `Iscritti · ${athletes.length}`
        }
      >
        {registrationLabel && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {registrationLabel}.
          </Typography>
        )}
        {athletes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nessun iscritto.
          </Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {athletes.map((a) => (
              <Box
                component="li"
                key={a.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.75,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                <RoleBadge role={a.role} />
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                  {a.name}
                </Typography>
                {past && <Attendance attended={a.attended} />}
              </Box>
            ))}
          </Box>
        )}
        {coaches.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {coaches.length === 1 ? "Allenatore" : "Allenatori"}:{" "}
            {coaches.map((c) => c.name).join(", ")}
          </Typography>
        )}
      </Section>

      <Section title="Squadre">
        {teams ? (
          <TeamDisplay
            sessionId={sessionId}
            teams={teams}
            teamsLoading={false}
            coaches={coaches}
            isEnded={past}
            onTeamsGenerated={() => {}}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {past ? "Nessuna squadra registrata." : "Squadre non ancora create."}
          </Typography>
        )}
      </Section>

      {past && (
        <Section title="Partitelle">
          {played.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nessun risultato registrato.
            </Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {played.map((r) => {
                const [i1, i2] = MATCHUP_TEAMS[r.matchup as string];
                return (
                  <Typography component="li" variant="body2" key={r.id} sx={{ py: 0.5 }}>
                    {TEAM_META[i1].name}{" "}
                    <Box component="strong" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {r.scoreA} - {r.scoreB}
                    </Box>{" "}
                    {TEAM_META[i2].name}
                  </Typography>
                );
              })}
            </Box>
          )}
        </Section>
      )}
    </Box>
  );
}
