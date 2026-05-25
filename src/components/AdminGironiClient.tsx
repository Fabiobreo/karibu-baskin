"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  TablePagination,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type CompetitiveTeamLite = { id: string; name: string; color: string | null; season: string };
type GroupCompetitiveTeam = { competitiveTeam: CompetitiveTeamLite };
type Group = {
  id: string;
  slug: string | null;
  name: string;
  season: string;
  championship: string | null;
  competitiveTeams: GroupCompetitiveTeam[];
  _count: { matches: number };
};
type SeasonOption = { label: string; isCurrent: boolean };

interface Props {
  initialGroups: Group[];
  seasons: SeasonOption[];
  defaultSeason: string;
}

export default function AdminGironiClient({ initialGroups, seasons, defaultSeason }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const [form, setForm] = useState({
    name: "",
    season: defaultSeason,
    championship: "",
  });
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(25);
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  function handleCreate() {
    startTransition(async () => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          season: form.season,
          championship: form.championship || undefined,
        }),
      });
      if (!res.ok) {
        showToast({ message: "Errore nella creazione del girone", severity: "error" });
        return;
      }
      const created = (await res.json()) as Group;
      setGroups((prev) =>
        [...prev, created].sort(
          (a, b) => b.season.localeCompare(a.season) || a.name.localeCompare(b.name)
        )
      );
      setForm({ name: "", season: defaultSeason, championship: "" });
      showToast({
        message: "Girone creato — aggiungi le squadre dalla pagina del girone",
        severity: "success",
      });
    });
  }

  function handleDelete(g: Group) {
    openConfirm(
      "Elimina girone",
      `Eliminare il girone "${g.name}"? Le partite associate verranno scollegate.`,
      () =>
        startTransition(async () => {
          const res = await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
          if (res.ok) {
            setGroups((prev) => prev.filter((x) => x.id !== g.id));
            showToast({ message: "Girone eliminato", severity: "success" });
          } else {
            showToast({ message: "Errore nell'eliminazione", severity: "error" });
          }
        })
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Gironi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gironi di campionato e risultati delle altre squadre del girone.
        </Typography>
      </Box>

      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Crea girone
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            label="Nome girone"
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ flex: 2, minWidth: 180 }}
            placeholder="es. Girone A Ovest"
          />
          <FormControl size="small" sx={{ flex: 1, minWidth: 140 }}>
            <InputLabel>Stagione</InputLabel>
            <Select
              value={form.season}
              label="Stagione"
              onChange={(e) => setForm((f) => ({ ...f, season: e.target.value as string }))}
            >
              {seasons.length === 0 ? (
                <MenuItem value="" disabled>
                  Nessuna stagione configurata
                </MenuItem>
              ) : (
                seasons.map((s) => (
                  <MenuItem key={s.label} value={s.label}>
                    {s.label}
                    {s.isCurrent ? " · corrente" : ""}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <TextField
            label="Campionato"
            size="small"
            value={form.championship}
            onChange={(e) => setForm((f) => ({ ...f, championship: e.target.value }))}
            sx={{ flex: 1, minWidth: 140 }}
            placeholder="es. Gold"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!form.name.trim() || !form.season.trim() || isPending}
            onClick={handleCreate}
          >
            Crea
          </Button>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1.5 }}>
          Le squadre (nostre e avversarie) si aggiungono dalla pagina del girone.
        </Typography>
      </Paper>

      {groups.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          Nessun girone creato.
        </Typography>
      ) : (
        <Paper elevation={0} variant="outlined">
          <Table size="small" aria-label="Lista gironi">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Girone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stagione</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Campionato</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nostre squadre</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Partite
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.slice(page * rpp, (page + 1) * rpp).map((g) => (
                <TableRow key={g.id} hover>
                  <TableCell>
                    <Link
                      href={`/admin/gironi/${g.slug ?? g.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                      >
                        {g.name}
                      </Typography>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{g.season}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {g.championship ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {g.competitiveTeams.length === 0 ? (
                      <Typography variant="caption" color="text.disabled">
                        nessuna
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                        {g.competitiveTeams.map(({ competitiveTeam: t }) => (
                          <Chip
                            key={t.id}
                            label={t.name}
                            size="small"
                            sx={{
                              bgcolor: t.color ?? "primary.main",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "0.68rem",
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="caption"
                      color={g._count.matches > 0 ? "primary" : "text.disabled"}
                    >
                      {g._count.matches}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Apri girone">
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label="Apri girone"
                        component={Link}
                        href={`/admin/gironi/${g.slug ?? g.id}`}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Elimina girone"
                        onClick={() => handleDelete(g)}
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
            count={groups.length}
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

      {ConfirmDialog}
    </Box>
  );
}
