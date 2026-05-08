"use client";
import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid2 as Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import GroupsIcon from "@mui/icons-material/Groups";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ROLE_LABELS, ROLE_COLORS, ROLES, TEAM_META } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

export interface TeamAthlete {
  id: string;
  name: string;
  role: number;
}

export interface TeamsData {
  teamA: TeamAthlete[];
  teamB: TeamAthlete[];
  teamC?: TeamAthlete[];
  coaches?: { id: string; name: string }[];
  numTeams: 2 | 3;
  generated: boolean;
}

interface Props {
  sessionId: string;
  isStaff?: boolean;
  registrationIds?: string[];
  coaches?: { id: string; name: string }[];
  slugMap?: Record<string, string>; // reg.id → user.slug
  currentUserTeamIndex?: number;    // tab da selezionare di default su mobile
  editMode?: boolean;               // controllato dal parent (via TeamsHeader)
  onExitEditMode?: () => void;
  // Stato squadre gestito dal parent
  teams: TeamsData | null;
  teamsLoading: boolean;
  onTeamsGenerated: (teams: TeamsData) => void;
}

// ── Badge ruolo (riutilizzato in entrambi i layout) ───────────────────────────

function RoleBadge({ role, count }: { role: number; count: number }) {
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center",
      borderRadius: "16px", overflow: "hidden",
      bgcolor: ROLE_COLORS[role], color: "#fff",
      fontSize: "0.8rem", lineHeight: 1,
      opacity: count === 0 ? 0.28 : 1,
    }}>
      <Box sx={{ px: 1.25, py: "5px", fontWeight: 700 }}>
        {ROLE_LABELS[role]}
      </Box>
      <Box sx={{ px: 1.25, py: "5px", fontWeight: 400, bgcolor: "rgba(0,0,0,0.22)" }}>
        {count} giocator{count !== 1 ? "i" : "e"}
      </Box>
    </Box>
  );
}

// ── Layout mobile: tab per squadra ────────────────────────────────────────────

export function MobileTeamTabs({ teams, slugMap = {}, defaultTab = 0 }: { teams: TeamsData; slugMap?: Record<string, string>; defaultTab?: number }) {
  const [tab, setTab] = useState(defaultTab);
  const meta = TEAM_META.slice(0, teams.numTeams);
  const allTeams = [teams.teamA, teams.teamB, ...(teams.teamC ? [teams.teamC] : [])];
  const activeColor = meta[tab].color;

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          "& .MuiTabs-indicator": { backgroundColor: activeColor, height: 3 },
          "& .MuiTab-root": { fontWeight: 700, fontSize: "0.85rem", minHeight: 48 },
          "& .MuiTab-root.Mui-selected": { color: activeColor },
        }}
      >
        {meta.map((m, i) => (
          <Tab
            key={m.name}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: m.color, flexShrink: 0 }} />
                <span>{m.name}</span>
                <Chip
                  label={allTeams[i].length}
                  size="small"
                  sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700,
                    bgcolor: tab === i ? m.color : "action.selected",
                    color: tab === i ? "#fff" : "text.secondary",
                  }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>
      <Box>
        {ROLES.map((role) => {
          const group = allTeams[tab].filter((a) => a.role === role);
          if (group.length === 0) return null;
          return (
            <Box key={role} sx={{ pb: 0.5 }}>
              <Box sx={{ px: 2, pt: 1 }}>
                <RoleBadge role={role} count={group.length} />
              </Box>
              <List dense disablePadding>
                {group.map((a) => {
                  const slug = slugMap[a.id];
                  return (
                    <ListItem key={a.id} sx={{ py: 0, px: 3 }}>
                      <ListItemText
                        primary={
                          slug ? (
                            <Link href={`/giocatori/${slug}`} style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}>
                              {a.name}
                            </Link>
                          ) : a.name
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ── Layout desktop: griglia allineata cross-column ────────────────────────────

export function AlignedTeamGrid({ teams, slugMap = {} }: { teams: TeamsData; slugMap?: Record<string, string> }) {
  const allTeams = [
    teams.teamA,
    teams.teamB,
    ...(teams.teamC ? [teams.teamC] : []),
  ];
  const meta = TEAM_META.slice(0, teams.numTeams);
  const cols = teams.numTeams;

  const cells: React.ReactNode[] = [];

  // ── Header ──
  meta.forEach((m, i) => {
    cells.push(
      <Box key={`header-${i}`} sx={{
        px: 2, py: 1.5,
        backgroundColor: m.color,
        display: "flex", alignItems: "center", gap: 1,
      }}>
        <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{m.name}</Typography>
        <Chip
          label={`${allTeams[i].length} atlet${allTeams[i].length !== 1 ? "i" : "a"}`}
          size="small"
          sx={{ backgroundColor: "rgba(255,255,255,0.3)", color: "#fff" }}
        />
      </Box>
    );
  });

  // ── Sezioni per ruolo ──
  for (const role of ROLES) {
    const groups = allTeams.map((t) => t.filter((a) => a.role === role));
    const maxCount = Math.max(...groups.map((g) => g.length));
    if (maxCount === 0) continue;

    // Riga badge
    groups.forEach((group, i) => {
      cells.push(
        <Box key={`badge-${role}-${i}`} sx={{
          px: 2, pt: 1, pb: 0.5,
        }}>
          <RoleBadge role={role} count={group.length} />
        </Box>
      );
    });

    // Righe atleti (padding con celle vuote fino a maxCount)
    for (let idx = 0; idx < maxCount; idx++) {
      groups.forEach((group, i) => {
        const athlete = group[idx];
        const slug = athlete ? slugMap[athlete.id] : undefined;
        cells.push(
          <Box key={`player-${role}-${idx}-${i}`} sx={{
            px: 3,
            minHeight: 32,
            display: "flex", alignItems: "center",
          }}>
            {athlete && (
              slug ? (
                <Link href={`/giocatori/${slug}`} style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{athlete.name}</Typography>
                </Link>
              ) : (
                <Typography variant="body2">{athlete.name}</Typography>
              )
            )}
          </Box>
        );
      });
    }
  }

  return (
    <Paper variant="outlined" sx={{
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
    }}>
      {cells}
    </Paper>
  );
}

// ── Team Editor (spostamento manuale, solo staff) ─────────────────────────────

type TeamKey = "teamA" | "teamB" | "teamC";

interface TeamEditorProps {
  teams: TeamsData;
  sessionId: string;
  onTeamsUpdated: (teams: TeamsData) => void;
  onDone: () => void;
}

function TeamEditor({ teams: initialTeams, sessionId, onTeamsUpdated, onDone }: TeamEditorProps) {
  const [localTeams, setLocalTeams] = useState<TeamsData>(initialTeams);
  const [selected, setSelected] = useState<{ id: string; fromKey: TeamKey } | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const teamKeys: TeamKey[] = localTeams.numTeams === 3 ? ["teamA", "teamB", "teamC"] : ["teamA", "teamB"];
  const meta = TEAM_META.slice(0, localTeams.numTeams);

  async function moveTo(toKey: TeamKey) {
    if (!selected || saving) return;
    const { id, fromKey } = selected;
    if (fromKey === toKey) return;

    const fromList = localTeams[fromKey] ?? [];
    const athlete = fromList.find((a) => a.id === id);
    if (!athlete) return;

    const prevTeams = localTeams;
    const newTeams: TeamsData = {
      ...localTeams,
      [fromKey]: fromList.filter((a) => a.id !== id),
      [toKey]: [...(localTeams[toKey] ?? []), athlete],
    };

    setLocalTeams(newTeams);
    setSelected(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/teams/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeams),
      });
      if (res.ok) {
        const saved: TeamsData = await res.json();
        onTeamsUpdated(saved);
        setLocalTeams(saved);
      } else {
        setLocalTeams(prevTeams);
        showToast({ message: "Errore nel salvataggio", severity: "error" });
      }
    } catch {
      setLocalTeams(prevTeams);
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
        {selected ? "Seleziona la squadra di destinazione" : "Tocca un giocatore per spostarlo"}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {teamKeys.map((key, i) => {
          const teamList = localTeams[key] ?? [];
          const m = meta[i];
          const isSource = selected?.fromKey === key;
          const canMoveTo = !!selected && !isSource;

          return (
            <Paper key={key} variant="outlined" sx={{ overflow: "hidden" }}>
              {/* Header */}
              <Box sx={{
                px: 2, py: 1,
                backgroundColor: m.color,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700 }}>
                    {m.name}
                  </Typography>
                  <Chip
                    label={teamList.length}
                    size="small"
                    sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700,
                      bgcolor: "rgba(255,255,255,0.3)", color: "#fff" }}
                  />
                </Box>
                {canMoveTo && (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={saving}
                    onClick={() => moveTo(key)}
                    sx={{
                      bgcolor: "#fff",
                      color: m.color,
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      py: 0.25,
                      minWidth: 90,
                      "&:hover": { bgcolor: "rgba(255,255,255,0.88)" },
                    }}
                  >
                    {saving ? <CircularProgress size={14} color="inherit" /> : "Sposta qui"}
                  </Button>
                )}
              </Box>

              {/* Athletes */}
              <Box sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {ROLES.flatMap((role) =>
                  teamList
                    .filter((a) => a.role === role)
                    .map((a) => {
                      const isSelected = selected?.id === a.id;
                      return (
                        <Chip
                          key={a.id}
                          label={a.name}
                          size="small"
                          disabled={saving}
                          onClick={() => setSelected(isSelected ? null : { id: a.id, fromKey: key })}
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            bgcolor: isSelected ? m.color : `${ROLE_COLORS[role]}22`,
                            color: isSelected ? "#fff" : "text.primary",
                            border: `1px solid ${isSelected ? m.color : ROLE_COLORS[role]}`,
                            boxShadow: isSelected ? `0 0 0 2px ${m.color}66` : "none",
                            cursor: "pointer",
                            "&:hover": { bgcolor: isSelected ? m.color : `${ROLE_COLORS[role]}44` },
                          }}
                        />
                      );
                    })
                )}
                {teamList.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ px: 0.5 }}>
                    Nessun giocatore
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button variant="outlined" size="small" onClick={onDone} disabled={saving}>
          Fatto
        </Button>
      </Box>
    </Box>
  );
}

// ── TeamDisplay ───────────────────────────────────────────────────────────────

export default function TeamDisplay({ sessionId, isStaff, registrationIds, coaches, slugMap = {}, currentUserTeamIndex, editMode = false, onExitEditMode, teams, teamsLoading, onTeamsGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [numTeams, setNumTeams] = useState<2 | 3>(teams?.numTeams ?? 2);
  const { showToast } = useToast();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/teams/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams }),
      });
      if (res.ok) {
        const data: TeamsData = await res.json();
        onTeamsGenerated(data);
        setNumTeams(data.numTeams);
        onExitEditMode?.();
        showToast({ message: "Squadre generate con successo!", severity: "success" });
      } else {
        const err = await res.json().catch(() => ({}));
        showToast({ message: err.error ?? "Errore nella generazione", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setGenerating(false);
    }
  }

  // Confronta il set di registration ID nelle squadre con quello attuale
  const registrationsChanged = (() => {
    if (!teams || !registrationIds) return false;
    const inTeams = new Set([
      ...teams.teamA.map((a) => a.id),
      ...teams.teamB.map((a) => a.id),
      ...(teams.teamC ?? []).map((a) => a.id),
    ]);
    const current = new Set(registrationIds);
    if (inTeams.size !== current.size) return true;
    for (const id of current) if (!inTeams.has(id)) return true;
    return false;
  })();

  if (teamsLoading) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} /></Grid>
      </Grid>
    );
  }

  // Staff senza squadre generate → pannello di generazione
  if (!teams && isStaff) {
    return (
      <Box sx={{
        py: 3, px: 3,
        textAlign: "center",
        borderRadius: 2,
        border: "1px dashed",
        borderColor: "primary.main",
        backgroundColor: "background.paper",
      }}>
        <GroupsIcon sx={{ fontSize: 36, color: "primary.main", mb: 1 }} />
        <Typography variant="body1" fontWeight={600} gutterBottom>
          Genera le squadre
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {registrationIds?.length
            ? `${registrationIds.length} atleti iscritti — scegli quante squadre formare.`
            : "Scegli quante squadre formare."}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <ToggleButtonGroup
            value={numTeams}
            exclusive
            size="small"
            onChange={(_e, val) => { if (val) setNumTeams(val as 2 | 3); }}
          >
            <ToggleButton value={2} sx={{ px: 3, fontWeight: 600 }}>2 squadre</ToggleButton>
            <ToggleButton value={3} sx={{ px: 3, fontWeight: 600 }}>3 squadre</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || !registrationIds?.length}
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <GroupsIcon />}
          >
            {generating ? "Generazione..." : "Genera squadre"}
          </Button>

          {!registrationIds?.length && (
            <Typography variant="caption" color="text.disabled">
              Nessun atleta iscritto — impossibile generare le squadre.
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Nessuna squadra, utente normale
  if (!teams) {
    return (
      <Box sx={{
        py: 4, px: 3,
        textAlign: "center",
        borderRadius: 2,
        border: "1px dashed rgba(0,0,0,0.15)",
        backgroundColor: "background.paper",
      }}>
        <SportsBasketballIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary" fontWeight={500}>
          Squadre non ancora pubblicate
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
          Le squadre verranno pubblicate dall&apos;amministratore prima dell&apos;allenamento.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Avviso iscritti cambiati (solo staff, non in modalità modifica) */}
      {isStaff && registrationsChanged && !editMode && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon fontSize="inherit" />}
          sx={{ mb: 2 }}
          action={
            <Button
              color="warning"
              size="small"
              variant="outlined"
              onClick={handleGenerate}
              disabled={generating}
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {generating ? "..." : "Ricrea"}
            </Button>
          }
        >
          Ci sono stati cambiamenti nelle iscrizioni.
        </Alert>
      )}

      {editMode ? (
        <TeamEditor
          teams={teams}
          sessionId={sessionId}
          onTeamsUpdated={(t) => onTeamsGenerated(t)}
          onDone={() => onExitEditMode?.()}
        />
      ) : isDesktop && teams.numTeams === 2 ? (
        <AlignedTeamGrid teams={teams} slugMap={slugMap} />
      ) : (
        <MobileTeamTabs teams={teams} slugMap={slugMap} defaultTab={currentUserTeamIndex} />
      )}

      {/* Allenatori presenti */}
      {coaches && coaches.length > 0 && (
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
            Allenatori:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {coaches.map((c) => {
              const slug = slugMap[c.id];
              return (
                <Chip
                  key={c.id}
                  size="small"
                  label={slug
                    ? <Link href={`/giocatori/${slug}`} style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}>{c.name}</Link>
                    : c.name
                  }
                  variant="outlined"
                  sx={{ fontSize: "0.75rem" }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
