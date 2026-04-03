"use client";
import { useState } from "react";
import {
  List,
  ListItem,
  ListItemText,
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
      <List disablePadding>
        {sessions.map((s) => {
          const isGenerating = generating === s.id;
          const hasTeams = !!s.teams;

          return (
            <ListItem
              key={s.id}
              divider
              secondaryAction={
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {/* Genera squadre */}
                  <Tooltip title={hasTeams ? "Rigenera squadre" : "Genera squadre"}>
                    <span>
                      <IconButton
                        color={hasTeams ? "success" : "primary"}
                        onClick={() => setTeamPickSession(s)}
                        disabled={isGenerating || s._count.registrations === 0}
                      >
                        {isGenerating
                          ? <CircularProgress size={20} />
                          : hasTeams
                          ? <CheckCircleIcon />
                          : <SportsBasketballIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>

                  {/* Apri pagina allenamento */}
                  <Tooltip title="Apri pagina allenamento">
                    <IconButton
                      href={`/allenamento/${s.dateSlug ?? s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="default"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  </Tooltip>

                  {/* Elimina */}
                  <Tooltip title="Elimina">
                    <IconButton edge="end" color="error" onClick={() => setToDelete(s)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {s.title}
                    </Typography>
                    <Chip label={`${s._count.registrations} iscritti`} size="small" />
                  </Box>
                }
                secondary={
                  format(new Date(s.date), "EEEE d MMMM yyyy", { locale: it }) +
                  " · " +
                  format(new Date(s.date), "HH:mm") +
                  (s.endTime ? `–${format(new Date(s.endTime), "HH:mm")}` : "")
                }
              />
            </ListItem>
          );
        })}
      </List>

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
