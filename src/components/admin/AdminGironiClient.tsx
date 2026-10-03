"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Link as MuiLink,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRef, useState, useTransition } from "react";
import { visuallyHidden } from "@mui/utils";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import { useToast } from "@/context/ToastContext";
import RowActions from "@/components/admin/RowActions";
import { readError } from "@/lib/fetchJson";
import { TOUCH_FIELD_ON_PHONE, TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import TeamChip from "@/components/teams/TeamChip";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
  const [rpp, setRpp] = useRowsPerPage("groups", [10, 25, 50], 25);
  const { showToast } = useToast();
  // Dopo un'eliminazione il focus va sull'intestazione della lista: la riga non c'è più.
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

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
        message: "Girone creato. Aggiungi le squadre dalla pagina del girone",
        severity: "success",
      });
    });
  }

  async function handleDelete(g: Group) {
    const res = await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast({ message: await readError(res), severity: "error" });
      return false;
    }
    setGroups((prev) => prev.filter((x) => x.id !== g.id));
    showToast({ message: "Girone eliminato", severity: "success" });
  }

  return (
    <Box>
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Crea girone
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            label="Nome girone"
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ flex: 2, minWidth: 180, ...TOUCH_FIELD_ON_PHONE }}
            placeholder="es. Girone A Ovest"
          />
          <FormControl size="small" sx={{ flex: 1, minWidth: 140, ...TOUCH_FIELD_ON_PHONE }}>
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
            sx={{ flex: 1, minWidth: 140, ...TOUCH_FIELD_ON_PHONE }}
            placeholder="es. Gold"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!form.name.trim() || !form.season.trim() || isPending}
            onClick={handleCreate}
            sx={TOUCH_TARGET_ON_PHONE}
          >
            Crea
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Le squadre (nostre e avversarie) si aggiungono dalla pagina del girone.
        </Typography>
      </Paper>

      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nessun girone creato.
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
            Gironi ({groups.length})
          </Typography>
          {/* Senza `TableContainer` la tabella e' piu' larga del viewport e
              trascina in orizzontale tutto il documento, header e breadcrumb
              compresi. Cosi' scorre solo lei, e la paginazione resta ferma. */}
          <TableContainer>
            <Table size="small" aria-label="Lista gironi">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>Girone</TableCell>
                  <TableCell sx={SECONDARY_HEAD_SX}>Stagione</TableCell>
                  <TableCell sx={SECONDARY_HEAD_SX}>Campionato</TableCell>
                  <TableCell sx={SECONDARY_HEAD_SX}>Nostre squadre</TableCell>
                  <TableCell sx={SECONDARY_HEAD_SX} align="center">
                    Partite
                  </TableCell>
                  <TableCell align="right">
                    <Box component="span" sx={visuallyHidden}>
                      Azioni
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.slice(page * rpp, (page + 1) * rpp).map((g) => (
                  <TableRow key={g.id} hover>
                    <TableCell>
                      {/* Il nome apre il girone (squadre, partite, modifica): su
                          telefono è alto 44 px, come ogni bersaglio. */}
                      <MuiLink
                        href={`/admin/gironi/${g.slug ?? g.id}`}
                        variant="body2"
                        underline="hover"
                        sx={{
                          fontWeight: FONT_WEIGHT.semibold,
                          color: "primary.onLight",
                          display: { xs: "flex", sm: "inline" },
                          alignItems: "center",
                          ...TOUCH_TARGET_ON_PHONE,
                        }}
                      >
                        {g.name}
                      </MuiLink>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: { xs: "block", sm: "none" } }}
                      >
                        {[g.season, g.championship].filter(Boolean).join(" · ")}
                      </Typography>
                    </TableCell>
                    <TableCell sx={SECONDARY_CELL_SX}>
                      <Typography variant="body2">{g.season}</Typography>
                    </TableCell>
                    <TableCell sx={SECONDARY_CELL_SX}>
                      <Typography variant="body2" color="text.secondary">
                        {g.championship ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={SECONDARY_CELL_SX}>
                      {g.competitiveTeams.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          nessuna
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          {g.competitiveTeams.map(({ competitiveTeam: t }) => (
                            <TeamChip
                              key={t.id}
                              name={t.name}
                              color={t.color}
                              sx={{ fontSize: TYPE_SCALE.xs }}
                            />
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={SECONDARY_CELL_SX}>
                      <Typography
                        variant="caption"
                        color={g._count.matches > 0 ? "text.primary" : "text.secondary"}
                      >
                        {g._count.matches}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {/* Niente bottone in riga: "Apri" ripeterebbe il link del nome. */}
                      <RowActions
                        subject={g.name}
                        onDelete={() => handleDelete(g)}
                        deleteLabel="Elimina girone…"
                        deleteConfirm={{
                          title: "Eliminare il girone?",
                          message: `Eliminare il girone "${g.name}"? Le partite associate verranno scollegate.`,
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
    </Box>
  );
}

/** Colonne secondarie: a 390 px spariscono, così il "⋯" resta nello schermo. */
const SECONDARY_CELL_SX = { display: { xs: "none", sm: "table-cell" } } as const;
const SECONDARY_HEAD_SX = { ...SECONDARY_CELL_SX, fontWeight: FONT_WEIGHT.semibold } as const;
