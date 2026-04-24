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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import GroupsIcon from "@mui/icons-material/Groups";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";
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
  numTeams: 2 | 3;
  generated: boolean;
}

interface Props {
  sessionId: string;
  isStaff?: boolean;
  registrationIds?: string[];
  slugMap?: Record<string, string>; // reg.id → user.slug
  // Stato squadre gestito dal parent
  teams: TeamsData | null;
  teamsLoading: boolean;
  onTeamsGenerated: (teams: TeamsData) => void;
}

const TEAM_META = [
  { name: "Arancioni", color: "#E65100" },
  { name: "Neri",      color: "#1A1A1A" },
  { name: "Bianchi",   color: "#757575" },
] as const;

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

// ── Layout mobile: colonne indipendenti impilate ──────────────────────────────

export function TeamColumn({ name, athletes, color, slugMap = {} }: { name: string; athletes: TeamAthlete[]; color: string; slugMap?: Record<string, string> }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", height: "100%" }}>
      <Box sx={{ px: 2, py: 1.5, backgroundColor: color, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>
          {name}
        </Typography>
        <Chip
          label={`${athletes.length} atlet${athletes.length !== 1 ? "i" : "a"}`}
          size="small"
          sx={{ backgroundColor: "rgba(255,255,255,0.3)", color: "#fff" }}
        />
      </Box>
      {ROLES.map((role) => {
        const group = athletes.filter((a) => a.role === role);
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

// ── TeamDisplay ───────────────────────────────────────────────────────────────

export default function TeamDisplay({ sessionId, isStaff, registrationIds, slugMap = {}, teams, teamsLoading, onTeamsGenerated }: Props) {
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

  const colSize = teams.numTeams === 3 ? { xs: 12, md: 4 } : { xs: 12, md: 6 };

  return (
    <Box>
      {/* Avviso iscritti cambiati (solo staff) */}
      {isStaff && registrationsChanged && (
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
              {generating ? "..." : "Rigenera"}
            </Button>
          }
        >
          Ci sono stati cambiamenti nelle iscrizioni. È consigliabile rigenerare le squadre.
        </Alert>
      )}

      {isDesktop ? (
        <AlignedTeamGrid teams={teams} slugMap={slugMap} />
      ) : (
        <Grid container spacing={2}>
          <Grid size={colSize}>
            <TeamColumn name="Arancioni" athletes={teams.teamA} color="#E65100" slugMap={slugMap} />
          </Grid>
          <Grid size={colSize}>
            <TeamColumn name="Neri" athletes={teams.teamB} color="#1A1A1A" slugMap={slugMap} />
          </Grid>
          {teams.numTeams === 3 && teams.teamC && (
            <Grid size={colSize}>
              <TeamColumn name="Bianchi" athletes={teams.teamC} color="#757575" slugMap={slugMap} />
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
