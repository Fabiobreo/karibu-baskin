"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AdminSessionTeams from "@/components/admin/AdminSessionTeams";
import ManageParticipantsDialog, {
  type ParticipantRegistration,
} from "@/components/admin/ManageParticipantsDialog";
import RoleBadge from "@/components/common/RoleBadge";
import { TEAM_META } from "@/lib/constants";
import { readError } from "@/lib/fetchJson";
import { useToast } from "@/context/ToastContext";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import {
  attendanceChanges,
  expectedMatchups,
  resultOps,
  type Attended,
  type MatchupKey,
  type SavedResult,
  type ScoreDraft,
} from "@/lib/trainingClose";
import type { TeamsData } from "@/lib/schemas";

export interface CloseAthlete {
  id: string;
  name: string;
  role: number;
  attended: Attended;
}

interface TrainingCloseFormProps {
  sessionId: string;
  title: string;
  date: string;
  athletes: CloseAthlete[];
  registrations: ParticipantRegistration[];
  teams: TeamsData | null;
  results: SavedResult[];
  /** Chiamata dopo un salvataggio riuscito; `concluded` se l'allenamento e' stato chiuso. */
  onSaved: (concluded: boolean) => void;
}

const MATCHUP_TEAMS: Record<MatchupKey, [number, number]> = {
  AB: [0, 1],
  AC: [0, 2],
  BC: [1, 2],
};

// Target di 44px: il modulo si usa col pollice, a bordo campo (UX-13).
const TOUCH = { minHeight: 44 } as const;

/**
 * Chiusura di un allenamento (UX-13): presenze con due bottoni espliciti,
 * squadre, punteggi delle partitelle e un solo salvataggio per tutto.
 * Prima: un pallino a tre stati ciclici, un "Salva" per partitella e poi
 * "Concludi allenamento".
 */
export default function TrainingCloseForm({
  sessionId,
  title,
  date,
  athletes,
  registrations,
  teams,
  results,
  onSaved,
}: TrainingCloseFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [attendance, setAttendance] = useState<Record<string, Attended>>({});
  const [scores, setScores] = useState<Partial<Record<MatchupKey, ScoreDraft>>>(() => {
    const init: Partial<Record<MatchupKey, ScoreDraft>> = {};
    for (const r of results) {
      if (r.matchup) init[r.matchup as MatchupKey] = { a: String(r.scoreA), b: String(r.scoreB) };
    }
    return init;
  });
  const [saving, setSaving] = useState<"save" | "conclude" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const effective = (a: CloseAthlete): Attended =>
    a.id in attendance ? attendance[a.id] : a.attended;

  const teamCount = teams ? (teams.teamC && teams.teamC.length > 0 ? 3 : 2) : 0;
  const matchups = expectedMatchups(teamCount);
  const pendingAttendance = attendanceChanges(athletes, attendance);
  const ops = resultOps(matchups, results, scores);
  const dirty =
    pendingAttendance.length > 0 ||
    ops.create.length + ops.update.length + ops.remove.length + ops.invalid.length > 0;
  useUnsavedChangesGuard(dirty);

  const present = athletes.filter((a) => effective(a) === true).length;
  const absent = athletes.filter((a) => effective(a) === false).length;
  const unmarked = athletes.length - present - absent;

  function markAllPresent() {
    setAttendance((prev) => {
      const next = { ...prev };
      for (const a of athletes) if (effective(a) === null) next[a.id] = true;
      return next;
    });
  }

  function setScore(m: MatchupKey, side: "a" | "b", value: string) {
    setScores((prev) => ({
      ...prev,
      [m]: { a: prev[m]?.a ?? "", b: prev[m]?.b ?? "", [side]: value.replace(/\D/g, "") },
    }));
  }

  async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await readError(res));
  }

  async function save(conclude: boolean) {
    setError(null);
    if (ops.invalid.length > 0) {
      setError("Ogni partitella ha bisogno di entrambi i punteggi (o di nessuno).");
      return;
    }
    setSaving(conclude ? "conclude" : "save");
    try {
      if (pendingAttendance.length > 0) {
        await send(`/api/sessions/${sessionId}/attendance`, "PUT", {
          attendance: pendingAttendance,
        });
      }
      // Le API dei risultati restano quelle di prima: ogni salvataggio
      // ricalcola il rating (TrueSkill) in una transazione sua.
      for (const r of ops.remove) {
        await send(`/api/sessions/${sessionId}/match-results/${r.id}`, "DELETE");
      }
      for (const r of ops.update) {
        await send(`/api/sessions/${sessionId}/match-results/${r.id}`, "PUT", {
          matchup: r.matchup,
          scoreA: r.scoreA,
          scoreB: r.scoreB,
        });
      }
      for (const r of ops.create) {
        await send(`/api/sessions/${sessionId}/match-results`, "POST", r);
      }
      if (conclude) await send(`/api/sessions/${sessionId}/conclude`, "POST");
      setAttendance({});
      showToast({
        message: conclude ? `"${title}" concluso` : "Modifiche salvate",
        severity: "success",
      });
      onSaved(conclude);
    } catch (err) {
      // Resta scritto qui, vicino ai bottoni, finche' non si riprova (UX-05).
      setError(err instanceof Error ? err.message : "Errore di rete. Riprova.");
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Typography variant="body2" color="text.secondary">
        Segna chi c&apos;era, scrivi i punteggi delle partitelle, poi salva.
      </Typography>

      {/* ── Presenze ── */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
          <Typography variant="subtitle1" component="h3" fontWeight={700} sx={{ flex: 1 }}>
            Presenze
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {present} presenti · {absent} assenti
              {unmarked > 0 ? ` · ${unmarked} da segnare` : ""}
            </Typography>
          </Typography>
          {unmarked > 0 && (
            <Button
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={markAllPresent}
              disabled={!!saving}
              sx={TOUCH}
            >
              Segna tutti presenti
            </Button>
          )}
          <Button
            variant="text"
            startIcon={<ManageAccountsIcon />}
            onClick={() => setManaging(true)}
            disabled={!!saving}
            sx={TOUCH}
          >
            Iscritti
          </Button>
        </Box>

        {athletes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nessun iscritto. Aggiungi chi c&apos;era da &quot;Iscritti&quot;.
          </Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {athletes.map((a) => {
              const value = effective(a);
              return (
                <Box
                  component="li"
                  key={a.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                    py: 0.75,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <RoleBadge role={a.role} />
                  <Typography
                    variant="body1"
                    sx={{
                      flex: 1,
                      minWidth: 120,
                      overflowWrap: "anywhere",
                      // Assente: barrato oltre al colore (UX-09).
                      textDecoration: value === false ? "line-through" : "none",
                      color: value === false ? "text.secondary" : "text.primary",
                    }}
                  >
                    {a.name}
                  </Typography>
                  {/* Due bottoni espliciti; nessuno dei due = non segnato.
                      Toccare di nuovo quello scelto lo toglie. */}
                  <ToggleButtonGroup
                    exclusive
                    value={value}
                    onChange={(_, v: Attended) => setAttendance((prev) => ({ ...prev, [a.id]: v }))}
                    aria-label={`Presenza di ${a.name}`}
                    disabled={!!saving}
                  >
                    <ToggleButton
                      value={true}
                      sx={{
                        ...TOUCH,
                        px: 1.5,
                        gap: 0.5,
                        textTransform: "none",
                        fontWeight: 700,
                        "&.Mui-selected, &.Mui-selected:hover": {
                          bgcolor: "success.main",
                          color: "common.white",
                        },
                      }}
                    >
                      <CheckIcon fontSize="small" />
                      Presente
                    </ToggleButton>
                    <ToggleButton
                      value={false}
                      sx={{
                        ...TOUCH,
                        px: 1.5,
                        gap: 0.5,
                        textTransform: "none",
                        fontWeight: 700,
                        "&.Mui-selected, &.Mui-selected:hover": {
                          bgcolor: "error.main",
                          color: "common.white",
                        },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                      Assente
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              );
            })}
          </Box>
        )}
        <ManageParticipantsDialog
          open={managing}
          onClose={() => setManaging(false)}
          sessionId={sessionId}
          sessionTitle={title}
          sessionDate={date}
          isPast
          registrations={registrations}
          onChanged={() => router.refresh()}
        />
      </Box>

      {athletes.length > 0 && (
        <>
          <Divider />
          {/* ── Squadre: servono per registrare le partitelle ── */}
          <AdminSessionTeams
            sessionId={sessionId}
            sessionTitle={title}
            sessionDate={date}
            initialTeams={teams}
            athletes={athletes
              .filter((a) => effective(a) !== false)
              .map(({ id, name, role }) => ({ id, name, role }))}
            coaches={registrations
              .filter((r) => r.registeredAsCoach)
              .map((r) => ({ id: r.id, name: r.name }))}
            // Il server esclude dalle squadre chi e' assente a database: le
            // presenze appena segnate si salvano prima di crearle.
            beforeGenerate={async () => {
              if (pendingAttendance.length > 0) {
                await send(`/api/sessions/${sessionId}/attendance`, "PUT", {
                  attendance: pendingAttendance,
                });
              }
            }}
          />

          {/* ── Partitelle ── */}
          <Box>
            <Typography variant="subtitle1" component="h3" fontWeight={700} sx={{ mb: 1 }}>
              Partitelle
            </Typography>
            {matchups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Crea le squadre per registrare i risultati delle partitelle.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {matchups.map((m) => {
                  const [i1, i2] = MATCHUP_TEAMS[m];
                  const t1 = TEAM_META[i1];
                  const t2 = TEAM_META[i2];
                  const invalid = ops.invalid.includes(m) && !!error;
                  return (
                    <Box
                      key={m}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      {[
                        { team: t1, side: "a" as const },
                        { team: t2, side: "b" as const },
                      ].map(({ team, side }, idx) => (
                        <Box key={side} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {idx === 1 && (
                            <Typography color="text.secondary" fontWeight={700} aria-hidden="true">
                              –
                            </Typography>
                          )}
                          <Box
                            aria-hidden="true"
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: team.color,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                          <Typography sx={{ minWidth: 72 }}>{team.name}</Typography>
                          <TextField
                            value={scores[m]?.[side] ?? ""}
                            onChange={(e) => setScore(m, side, e.target.value)}
                            placeholder="0"
                            error={invalid}
                            disabled={!!saving}
                            slotProps={{
                              htmlInput: {
                                inputMode: "numeric",
                                pattern: "[0-9]*",
                                maxLength: 3,
                                "aria-label": `Punti ${team.name} (${t1.name} contro ${t2.name})`,
                              },
                            }}
                            sx={{ width: 72, "& input": { textAlign: "center", fontWeight: 700 } }}
                          />
                        </Box>
                      ))}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </>
      )}

      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1.5,
          flexWrap: "wrap",
          pt: 1,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          variant="outlined"
          onClick={() => save(false)}
          disabled={!!saving || !dirty}
          startIcon={
            saving === "save" ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveOutlinedIcon />
            )
          }
          sx={TOUCH}
        >
          Salva senza concludere
        </Button>
        <Button
          variant="contained"
          onClick={() => save(true)}
          disabled={!!saving}
          startIcon={
            saving === "conclude" ? <CircularProgress size={16} color="inherit" /> : <DoneAllIcon />
          }
          sx={{ ...TOUCH, fontWeight: 700 }}
        >
          Salva e concludi
        </Button>
      </Box>
    </Box>
  );
}
