"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid2 as Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";

interface Athlete {
  id: string;
  name: string;
  role: number;
}

interface Teams {
  teamA: Athlete[];
  teamB: Athlete[];
}

interface Props {
  sessionId: string;
}

function TeamColumn({ name, athletes, color }: { name: string; athletes: Athlete[]; color: string }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", height: "100%" }}>
      <Box sx={{ px: 2, py: 1.5, backgroundColor: color, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>
          {name}
        </Typography>
        <Chip
          label={`${athletes.length} atleti`}
          size="small"
          sx={{ backgroundColor: "rgba(255,255,255,0.3)", color: "#fff" }}
        />
      </Box>
      {ROLES.map((role) => {
        const group = athletes.filter((a) => a.role === role);
        if (group.length === 0) return null;
        return (
          <Box key={role}>
            <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
              <Chip
                label={`${ROLE_LABELS[role]} (${group.length})`}
                size="small"
                sx={{ backgroundColor: ROLE_COLORS[role], color: "#fff" }}
              />
            </Box>
            <List dense disablePadding>
              {group.map((a) => (
                <ListItem key={a.id} sx={{ py: 0 }}>
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

export default function TeamDisplay({ sessionId }: Props) {
  const [teams, setTeams] = useState<Teams | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTeams() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${sessionId}`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const data = await res.json();
      if (data.teamA.length === 0 && data.teamB.length === 0) {
        setError("Nessun atleta iscritto, impossibile generare le squadre");
        return;
      }
      setTeams(data);
    } catch {
      setError("Errore nel caricamento delle squadre");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Button
        variant="contained"
        color="secondary"
        size="large"
        onClick={loadTeams}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SportsSoccerIcon />}
        sx={{ mb: 2 }}
      >
        {loading ? "Generando squadre..." : teams ? "Rigenera squadre" : "Genera squadre"}
      </Button>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {teams && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TeamColumn name="Arancioni" athletes={teams.teamA} color="#E65100" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TeamColumn name="Neri" athletes={teams.teamB} color="#1A1A1A" />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
