"use client";
import { useEffect, useState } from "react";
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
} from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";

interface Athlete {
  id: string;
  name: string;
  role: number;
}

interface Teams {
  teamA: Athlete[];
  teamB: Athlete[];
  teamC?: Athlete[];
  numTeams: 2 | 3;
  generated: boolean;
}

interface Props {
  sessionId: string;
}

export function TeamColumn({ name, athletes, color }: { name: string; athletes: Athlete[]; color: string }) {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams/${sessionId}`)
      .then((r) => r.json())
      .then((data: Teams) => {
        if (data.generated) setTeams(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} /></Grid>
      </Grid>
    );
  }

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
          Squadre non ancora generate
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
          Le squadre verranno pubblicate dall&apos;amministratore prima dell&apos;allenamento.
        </Typography>
      </Box>
    );
  }

  const colSize = teams.numTeams === 3 ? { xs: 12, md: 4 } : { xs: 12, md: 6 };

  return (
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
  );
}
