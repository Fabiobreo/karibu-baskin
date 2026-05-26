"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  TablePagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import OpposingTeamEditDialog, {
  type OpposingTeamEditable,
} from "@/components/OpposingTeamEditDialog";

type OpposingTeam = OpposingTeamEditable;

interface Props {
  initialOpponents: OpposingTeam[];
}

export default function AdminAvversarieClient({ initialOpponents }: Props) {
  const [opponents, setOpponents] = useState(initialOpponents);
  const [form, setForm] = useState({ name: "", city: "" });
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(25);
  const [editTeam, setEditTeam] = useState<OpposingTeam | null>(null);
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  async function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/opposing-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        showToast({ message: "Errore nella creazione", severity: "error" });
        return;
      }
      const created = (await res.json()) as OpposingTeam;
      setOpponents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", city: "" });
      showToast({ message: "Squadra avversaria creata", severity: "success" });
    });
  }

  function handleDelete(id: string, name: string) {
    openConfirm("Elimina squadra avversaria", `Eliminare la squadra avversaria "${name}"?`, () =>
      startTransition(async () => {
        const res = await fetch(`/api/opposing-teams/${id}`, { method: "DELETE" });
        if (res.ok) {
          setOpponents((prev) => prev.filter((o) => o.id !== id));
          showToast({ message: "Squadra eliminata", severity: "success" });
        } else {
          showToast({ message: "Errore nell'eliminazione", severity: "error" });
        }
      })
    );
  }

  return (
    <Box>
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Aggiungi squadra avversaria
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            label="Nome"
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ flex: 2, minWidth: 160 }}
            placeholder="es. Basket Vicenza"
          />
          <TextField
            label="Città"
            size="small"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            sx={{ flex: 1, minWidth: 120 }}
            placeholder="es. Vicenza"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleSave}
            disabled={!form.name.trim() || isPending}
          >
            Aggiungi
          </Button>
        </Box>
      </Paper>

      {opponents.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          Nessuna squadra avversaria registrata.
        </Typography>
      ) : (
        <Paper elevation={0} variant="outlined">
          <Table size="small" aria-label="Lista squadre avversarie">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Città</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {opponents.slice(page * rpp, (page + 1) * rpp).map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>
                    {o.slug ? (
                      <Link
                        href={`/avversarie/${o.slug}`}
                        target="_blank"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ "&:hover": { color: "primary.main" } }}
                        >
                          {o.name}
                        </Typography>
                      </Link>
                    ) : (
                      <Typography variant="body2" fontWeight={600}>
                        {o.name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {o.city ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Modifica">
                      <IconButton
                        size="small"
                        aria-label="Modifica squadra avversaria"
                        onClick={() => setEditTeam(o)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Elimina squadra avversaria"
                        onClick={() => handleDelete(o.id, o.name)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={opponents.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rpp}
            onRowsPerPageChange={(e) => {
              setRpp(parseInt(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Righe:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
            sx={{ borderTop: "1px solid", borderColor: "divider" }}
          />
        </Paper>
      )}

      <OpposingTeamEditDialog
        open={!!editTeam}
        onClose={() => setEditTeam(null)}
        team={editTeam}
        onSaved={(saved) => {
          setOpponents((prev) =>
            prev
              .map((o) => (o.id === saved.id ? { ...o, ...saved } : o))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
          showToast({ message: "Squadra aggiornata", severity: "success" });
        }}
      />

      {ConfirmDialog}
    </Box>
  );
}
