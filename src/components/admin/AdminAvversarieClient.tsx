"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRef, useState, useTransition } from "react";
import { visuallyHidden } from "@mui/utils";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import { useToast } from "@/context/ToastContext";
import RowActions from "@/components/admin/RowActions";
import { readError } from "@/lib/fetchJson";
import { TOUCH_FIELD_ON_PHONE, TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import OpposingTeamEditDialog, {
  type OpposingTeamEditable,
} from "@/components/teams/OpposingTeamEditDialog";
import { FONT_WEIGHT } from "@/lib/fontWeight";

type OpposingTeam = OpposingTeamEditable;

interface Props {
  initialOpponents: OpposingTeam[];
}

export default function AdminAvversarieClient({ initialOpponents }: Props) {
  const [opponents, setOpponents] = useState(initialOpponents);
  const [form, setForm] = useState({ name: "", city: "" });
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useRowsPerPage("opponents", [10, 25, 50], 25);
  const [editTeam, setEditTeam] = useState<OpposingTeam | null>(null);
  const { showToast } = useToast();
  // Dopo un'eliminazione il focus va sull'intestazione della lista: la riga non c'è più.
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

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

  async function handleDelete(id: string) {
    const res = await fetch(`/api/opposing-teams/${id}`, { method: "DELETE" });
    if (!res.ok) {
      // 409 se la squadra ha partite: il messaggio dell'API spiega perché.
      showToast({ message: await readError(res), severity: "error" });
      return false;
    }
    setOpponents((prev) => prev.filter((o) => o.id !== id));
    showToast({ message: "Squadra eliminata", severity: "success" });
  }

  return (
    <Box>
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Aggiungi squadra avversaria
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            label="Nome"
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ flex: 2, minWidth: 160, ...TOUCH_FIELD_ON_PHONE }}
            placeholder="es. Basket Vicenza"
          />
          <TextField
            label="Città"
            size="small"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            sx={{ flex: 1, minWidth: 120, ...TOUCH_FIELD_ON_PHONE }}
            placeholder="es. Vicenza"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleSave}
            disabled={!form.name.trim() || isPending}
            sx={TOUCH_TARGET_ON_PHONE}
          >
            Aggiungi
          </Button>
        </Box>
      </Paper>

      {opponents.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nessuna squadra avversaria registrata.
        </Typography>
      ) : (
        <Paper elevation={0} variant="outlined">
          <Typography
            ref={listHeadingRef}
            tabIndex={-1}
            component="h2"
            variant="subtitle2"
            sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", outline: "none" }}
          >
            Squadre registrate ({opponents.length})
          </Typography>
          <TableContainer>
            <Table size="small" aria-label="Lista squadre avversarie">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>Nome</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: FONT_WEIGHT.semibold,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    Città
                  </TableCell>
                  <TableCell align="right">
                    <Box component="span" sx={visuallyHidden}>
                      Azioni
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {opponents.slice(page * rpp, (page + 1) * rpp).map((o) => (
                  <TableRow key={o.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                        {o.name}
                      </Typography>
                      {/* Su telefono la città scende sotto il nome: il "⋯" resta nello schermo. */}
                      {o.city && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: { xs: "block", sm: "none" } }}
                        >
                          {o.city}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="body2" color="text.secondary">
                        {o.city ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <RowActions
                        subject={o.name}
                        primary={{ label: "Modifica", onClick: () => setEditTeam(o) }}
                        items={
                          o.slug
                            ? [
                                {
                                  label: "Pagina pubblica",
                                  href: `/avversarie/${o.slug}`,
                                  external: true,
                                },
                              ]
                            : []
                        }
                        onDelete={() => handleDelete(o.id)}
                        deleteLabel="Elimina squadra…"
                        deleteConfirm={{
                          title: "Eliminare la squadra avversaria?",
                          message: `Eliminare "${o.name}" dall'anagrafica? Se compare in una partita del club o di un girone non si può: va prima tolta da lì.`,
                        }}
                        focusAfterDelete={listHeadingRef}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
    </Box>
  );
}
