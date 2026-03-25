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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface SessionWithCount {
  id: string;
  title: string;
  date: string | Date;
  _count: { registrations: number };
}

interface Props {
  sessions: SessionWithCount[];
  onDeleted: () => void;
}

export default function AdminSessionList({ sessions, onDeleted }: Props) {
  const [toDelete, setToDelete] = useState<SessionWithCount | null>(null);
  const [loading, setLoading] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setLoading(true);
    try {
      await fetch(`/api/sessions/${toDelete.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setLoading(false);
      setToDelete(null);
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
        {sessions.map((s) => (
          <ListItem
            key={s.id}
            divider
            secondaryAction={
              <IconButton
                edge="end"
                color="error"
                onClick={() => setToDelete(s)}
                title="Elimina"
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {s.title}
                  </Typography>
                  <Chip label={`${s._count.registrations} iscritti`} size="small" />
                </Box>
              }
              secondary={format(new Date(s.date), "EEEE d MMMM yyyy 'ore' HH:mm", { locale: it })}
            />
          </ListItem>
        ))}
      </List>

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>Elimina allenamento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler eliminare &quot;{toDelete?.title}&quot;? Verranno eliminate anche
            tutte le iscrizioni associate. Questa azione è irreversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={loading}>
            {loading ? "Eliminazione..." : "Elimina"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
