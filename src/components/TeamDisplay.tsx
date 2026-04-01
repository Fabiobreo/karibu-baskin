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
} from "@mui/material";
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
  // Stato squadre gestito dal parent
  teams: TeamsData | null;
  teamsLoading: boolean;
  onTeamsGenerated: (teams: TeamsData) => void;
}

export function TeamColumn({ name, athletes, color }: { name: string; athletes: TeamAthlete[]; color: string }) {
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
          <Box key={role} sx={{ pb:0.5 }}>
            <Box sx={{ px: 2, pt: 1 }}>
              <Box sx={{ display: "inline-flex", alignItems: "center", mb: 0.5, borderRadius: "16px", overflow: "hidden", bgcolor: ROLE_COLORS[role], color: "#fff", fontSize: "0.8rem", lineHeight: 1 }}>
                <Box sx={{ px: 1.25, py: "5px", fontWeight: 700 }}>
                  {ROLE_LABELS[role]}
                </Box>
                <Box sx={{ px: 1.25, py: "5px", fontWeight: 400, bgcolor: "rgba(0,0,0,0.22)" }}>
                  {group.length} giocator{group.length > 1 ? "i" : "e"}
                </Box>
              </Box>
            </Box>
            <List dense disablePadding>
              {group.map((a) => (
                <ListItem key={a.id} sx={{ py: 0, px: 3 }}>
                  <ListItemText primary={a.name} />
                </ListItem>
              ))}
            </List>
          </Box>
        );
      })}
    </Paper>
  );
}

export default function TeamDisplay({ sessionId, isStaff, registrationIds, teams, teamsLoading, onTeamsGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [numTeams, setNumTeams] = useState<2 | 3>(teams?.numTeams ?? 2);
  const { showToast } = useToast();

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

  const teamsAthleteCount = teams
    ? teams.teamA.length + teams.teamB.length + (teams.teamC?.length ?? 0)
    : 0;

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
      <Box
        sx={{
          py: 3,
          px: 3,
          textAlign: "center",
          borderRadius: 2,
          border: "1px dashed",
          borderColor: "primary.main",
          backgroundColor: "background.paper",
        }}
      >
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
      <Box
        sx={{
          py: 4,
          px: 3,
          textAlign: "center",
          borderRadius: 2,
          border: "1px dashed rgba(0,0,0,0.15)",
          backgroundColor: "background.paper",
        }}
      >
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

      <Grid container spacing={2}>
        <Grid size={colSize}>
          <TeamColumn name="Arancioni" athletes={teams.teamA} color="#E65100" />
        </Grid>
        <Grid size={colSize}>
          <TeamColumn name="Neri" athletes={teams.teamB} color="#1A1A1A" />
        </Grid>
        {teams.numTeams === 3 && teams.teamC && (
          <Grid size={colSize}>
            <TeamColumn name="Bianchi" athletes={teams.teamC} color="#757575" />
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
