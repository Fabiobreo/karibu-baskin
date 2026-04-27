"use client";
import { useState } from "react";
import {
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  Box,
  Tooltip,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";

interface SessionWithCount {
  id: string;
  title: string;
  date: string | Date;
  endTime: string | Date | null;
  dateSlug: string | null;
  teams: object | null;
  _count: { registrations: number };
}

interface Props {
  sessions: SessionWithCount[];
  onDeleted: () => void;
  onTeamsGenerated: () => void;
}

export default function AdminSessionList({ sessions, onDeleted, onTeamsGenerated }: Props) {
  const [toDelete, setToDelete] = useState<SessionWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [teamPickSession, setTeamPickSession] = useState<SessionWithCount | null>(null);
  const { showToast } = useToast();

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/sessions/${toDelete.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  async function generateTeams(session: SessionWithCount, numTeams: 2 | 3) {
    setTeamPickSession(null);
    setGenerating(session.id);
    const wasAlreadyGenerated = !!session.teams;
    try {
      const res = await fetch(`/api/teams/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams }),
      });
      if (res.ok) {
        onTeamsGenerated();
        showToast({
          message: wasAlreadyGenerated
            ? `Squadre rigenerate per "${session.title}"`
            : `${numTeams} squadre generate per "${session.title}"`,
          severity: "success",
        });
      } else {
        showToast({ message: "Errore nella generazione delle squadre", severity: "error" });
      }
    } finally {
      setGenerating(null);
    }
  }

  if (sessions.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Nessun allenamento programmato.
      </Typography>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        {sessions.map((s) => {
          const isGenerating = generating === s.id;
          const hasTeams = !!s.teams;
          const href = `/allenamento/${s.dateSlug ?? s.id}`;
          const date = new Date(s.date);
          const endTime = s.endTime ? new Date(s.endTime) : null;

          return (
            <Paper
              key={s.id}
              variant="outlined"
              sx={{ position: "relative", cursor: "pointer", "&:hover": { boxShadow: 2 }, overflow: "hidden" }}
            >
              {/* Stretched link */}
              <Box
                component={Link}
                href={href}
                aria-label={s.title}
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 0,
                  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: "-2px" },
                }}
              />

              <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                {/* Info principale — pointerEvents none per passare click al link */}
                <Box sx={{ flex: 1, minWidth: 0, pointerEvents: "none", position: "relative", zIndex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>{s.title}</Typography>
                    {hasTeams && (
                      <Chip icon={<CheckCircleIcon />} label="Squadre pronte" size="small" color="success" variant="outlined"
                        sx={{ fontSize: "0.65rem", height: 20 }} />
                    )}
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <CalendarTodayIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary">
                        {format(date, "EEE d MMM yyyy", { locale: it })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary">
                        {format(date, "HH:mm")}{endTime && `–${format(endTime, "HH:mm")}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <GroupsIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary">
                        {s._count.registrations} iscritti
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Azioni — z-index sopra il link */}
                <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0, position: "relative", zIndex: 1 }}>
                  <Tooltip title={hasTeams ? "Rigenera squadre" : "Genera squadre"}>
                    <span>
                      <IconButton
                        size="small"
                        color={hasTeams ? "success" : "primary"}
                        aria-label={hasTeams ? "Rigenera squadre" : "Genera squadre"}
                        onClick={() => setTeamPickSession(s)}
                        disabled={isGenerating || s._count.registrations === 0}
                      >
                        {isGenerating
                          ? <CircularProgress size={18} />
                          : hasTeams
                          ? <CheckCircleIcon fontSize="small" />
                          : <SportsBasketballIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton size="small" color="error" aria-label="Elimina allenamento" onClick={() => setToDelete(s)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {/* Dialogo scelta numero squadre */}
      <Dialog open={!!teamPickSession} onClose={() => setTeamPickSession(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Quante squadre?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Scegli il numero di squadre da generare per <strong>{teamPickSession?.title}</strong>.
          </DialogContentText>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => generateTeams(teamPickSession!, 2)}
              sx={{ py: 1.5, fontSize: "1rem" }}
            >
              2 squadre
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => generateTeams(teamPickSession!, 3)}
              sx={{ py: 1.5, fontSize: "1rem" }}
            >
              3 squadre
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamPickSession(null)}>Annulla</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>Elimina allenamento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler eliminare &quot;{toDelete?.title}&quot;? Verranno eliminate anche
            tutte le iscrizioni associate. Questa azione è irreversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>
            Annulla
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Eliminazione..." : "Elimina"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
