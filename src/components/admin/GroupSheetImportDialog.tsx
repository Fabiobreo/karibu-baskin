"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import type { NameTarget, RowAction, SheetImportResponse } from "@/lib/groups/sheetImport";

interface GroupSheetImportDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  /** Stagione del girone ("2026-27"): dal 2026-27 l'EISI pubblica sul sito, prima sui fogli. */
  groupSeason: string;
  onImported: (message: string) => void;
}

type Row = SheetImportResponse["rows"][number];
type Source = "site" | "sheet";

/** Dalla stagione 2026-27 calendario e risultati stanno su eisi.it. */
function defaultSource(season: string): Source {
  return Number(season.slice(0, 4)) >= 2026 ? "site" : "sheet";
}

/** Proposta di girone: quello del sito con più parole in comune con il nostro. */
function guessLeague(leagues: Array<{ id: number; name: string }>, groupName: string): string {
  const words = (t: string) =>
    new Set(
      t
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 0 && w !== "girone")
    );
  const ours = words(groupName);
  let best = "";
  let bestScore = 0;
  for (const l of leagues) {
    const score = [...words(l.name)].filter((w) => ours.has(w)).length;
    if (score > bestScore) {
      best = String(l.id);
      bestScore = score;
    }
  }
  return best;
}

const ACTION_LABEL: Record<RowAction, string> = {
  create: "Nuova",
  update: "Da aggiornare",
  same: "Già uguale",
  conflict: "Punteggio diverso",
  skip: "Saltata",
};

/** Il valore di una scelta nel Select: "ours:<id>", "opp:<id>", "new", "skip". */
function targetValue(t: NameTarget): string {
  if (t.kind === "ours") return `ours:${t.teamId}`;
  if (t.kind === "opponent") return `opp:${t.opposingTeamId}`;
  return t.kind;
}

function valueTarget(v: string): NameTarget {
  if (v.startsWith("ours:")) return { kind: "ours", teamId: v.slice(5) };
  if (v.startsWith("opp:")) return { kind: "opponent", opposingTeamId: v.slice(4) };
  return v === "skip" ? { kind: "skip" } : { kind: "new" };
}

function score(r: Row): string {
  return r.homeScore !== null && r.awayScore !== null ? `${r.homeScore}–${r.awayScore}` : "—";
}

export default function GroupSheetImportDialog({
  open,
  onClose,
  groupId,
  groupName,
  groupSeason,
  onImported,
}: GroupSheetImportDialogProps) {
  const [source, setSource] = useState<Source>(() => defaultSource(groupSeason));
  const [url, setUrl] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [names, setNames] = useState<Record<string, NameTarget>>({});
  const [useSheet, setUseSheet] = useState<Set<number>>(new Set());
  const [onlyChanges, setOnlyChanges] = useState(true);
  const [keepMatchdays, setKeepMatchdays] = useState(false);
  const [preview, setPreview] = useState<SheetImportResponse | null>(null);

  const leagues = useQuery({
    queryKey: ["eisi-leagues", groupId],
    enabled: open && source === "site",
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/sheet-import`);
      if (!res.ok) throw new Error(await readError(res));
      return ((await res.json()) as { leagues: Array<{ id: number; name: string }> }).leagues;
    },
  });
  // Il girone proposto vale finché lo staff non ne sceglie un altro.
  const selectedLeague = leagueId || (leagues.data ? guessLeague(leagues.data, groupName) : "");
  const ready = source === "site" ? !!selectedLeague : !!url.trim();

  const request = useMutation({
    mutationFn: async (vars: {
      names: Record<string, NameTarget>;
      useSheetScore: number[];
      keepMatchdays: boolean;
      apply: boolean;
    }) => {
      const res = await fetch(`/api/groups/${groupId}/sheet-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(source === "site" ? { eisiLeagueId: Number(selectedLeague) } : { url }),
          ...vars,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as SheetImportResponse;
    },
    onSuccess: (data, vars) => {
      if (vars.apply) {
        const s = data.summary;
        const parts = [
          s.create > 0 && `${s.create} nuove`,
          s.update > 0 && `${s.update} aggiornate`,
          data.applied?.createdOpponents && `${data.applied.createdOpponents} avversarie create`,
        ].filter(Boolean);
        onImported(parts.length > 0 ? `Import fatto: ${parts.join(", ")}` : "Niente da cambiare");
        reset();
        return;
      }
      setPreview(data);
      setNames(Object.fromEntries(data.names.map((n) => [n.name, n.target])));
    },
  });

  function reset() {
    setPreview(null);
    setNames({});
    setUseSheet(new Set());
    setOnlyChanges(true);
    setKeepMatchdays(false);
    request.reset();
  }

  function close() {
    if (request.isPending) return;
    reset();
    onClose();
  }

  function run(
    nextNames: Record<string, NameTarget>,
    nextUseSheet: Set<number>,
    apply: boolean,
    keep = keepMatchdays
  ) {
    request.mutate({
      names: nextNames,
      useSheetScore: [...nextUseSheet],
      keepMatchdays: keep,
      apply,
    });
  }

  function changeName(name: string, value: string) {
    const next = { ...names, [name]: valueTarget(value) };
    setNames(next);
    run(next, useSheet, false);
  }

  function toggleSheetScore(n: number, on: boolean) {
    const next = new Set(useSheet);
    if (on) next.add(n);
    else next.delete(n);
    setUseSheet(next);
    run(names, next, false);
  }

  const rows = useMemo(() => {
    if (!preview) return [];
    const list = onlyChanges ? preview.rows.filter((r) => r.action !== "same") : preview.rows;
    return [...list].sort((a, b) => a.matchday - b.matchday || a.date.localeCompare(b.date));
  }, [preview, onlyChanges]);

  // Una gara già portata al foglio resta "update" ma si riconosce dal numero.
  const conflicts = preview
    ? preview.rows.filter((r) => r.action === "conflict" || useSheet.has(r.number))
    : [];
  // Anche una gara in conflitto si scrive (giornata, data, girone), punteggio a parte.
  const toWrite = preview
    ? preview.rows.filter(
        (r) =>
          r.action === "create" ||
          r.action === "update" ||
          (r.action === "conflict" && r.changes.length > 0)
      ).length
    : 0;
  const oursInSheet = Object.values(names).filter((t) => t.kind === "ours").length;
  const matchdays = preview ? Math.max(0, ...preview.rows.map((r) => r.matchday)) : 0;

  return (
    <ResponsiveDialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>Importa dall&apos;EISI · {groupName}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Calendario e risultati del girone dall&apos;EISI: dalla stagione 2026/27 stanno sul
              sito eisi.it, prima nei fogli Google pubblicati. Prima vedi cosa cambia, poi confermi.
              Le partite delle nostre squadre finiscono in Partite (con convocazioni e statistiche),
              le altre nei risultati del girone. Puoi ripetere l&apos;import quando escono risultati
              nuovi.
            </Typography>
            <ToggleButtonGroup
              value={source}
              exclusive
              size="small"
              sx={{ mb: 1.5 }}
              onChange={(_, v: Source | null) => {
                if (!v) return;
                setSource(v);
                setPreview(null);
                request.reset();
              }}
              aria-label="Da dove leggere le gare"
            >
              <ToggleButton value="site">Sito eisi.it</ToggleButton>
              <ToggleButton value="sheet">Foglio Google</ToggleButton>
            </ToggleButtonGroup>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {source === "site" ? (
                <FormControl size="small" fullWidth>
                  <InputLabel id="eisi-league">Girone sul sito EISI</InputLabel>
                  <Select
                    labelId="eisi-league"
                    label="Girone sul sito EISI"
                    value={leagues.data ? selectedLeague : ""}
                    onChange={(e) => {
                      setLeagueId(e.target.value);
                      setPreview(null);
                    }}
                    disabled={request.isPending || !leagues.data}
                    endAdornment={
                      leagues.isLoading ? <CircularProgress size={18} sx={{ mr: 3 }} /> : undefined
                    }
                  >
                    {(leagues.data ?? []).map((l) => (
                      <MenuItem key={l.id} value={String(l.id)}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label="Link del foglio"
                  placeholder="https://docs.google.com/spreadsheets/d/e/…/pubhtml?gid=…"
                  size="small"
                  fullWidth
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setPreview(null);
                  }}
                  disabled={request.isPending}
                />
              )}
              <Button
                variant={preview ? "outlined" : "contained"}
                onClick={() => run(preview ? names : {}, useSheet, false)}
                disabled={!ready || request.isPending}
                sx={{ flexShrink: 0 }}
              >
                {preview ? "Rileggi" : "Leggi le gare"}
              </Button>
            </Stack>
            {source === "site" && leagues.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {leagues.error.message}
              </Alert>
            )}
          </Box>

          {request.isError && <Alert severity="error">{request.error.message}</Alert>}

          {preview && (
            <>
              {preview.title && (
                <Typography variant="subtitle1" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                  {preview.title} · {preview.rows.length} gare in {matchdays} giornate
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Le giornate sono ricalcolate come le facciamo noi: in ordine di data, ogni squadra
                gioca al più una volta per giornata. Si possono correggere dopo, partita per
                partita.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={keepMatchdays}
                    disabled={request.isPending}
                    onChange={(e) => {
                      setKeepMatchdays(e.target.checked);
                      run(names, useSheet, false, e.target.checked);
                    }}
                  />
                }
                label="Tieni le giornate già salvate (le ricalcolo solo per le partite nuove)"
              />
              {preview.warnings.map((w) => (
                <Alert key={w} severity="warning">
                  {w}
                </Alert>
              ))}

              {/* Abbinamento dei nomi */}
              <Box>
                <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                  Squadre del foglio
                </Typography>
                {oursInSheet === 0 && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Nessun nome è abbinato a una nostra squadra: le nostre partite finirebbero fra i
                    risultati delle altre squadre.
                  </Alert>
                )}
                <Stack spacing={1}>
                  {preview.names.map((n) => {
                    const t = names[n.name] ?? n.target;
                    return (
                      <Box
                        key={n.name}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                          gap: 1,
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          {n.name}{" "}
                          <Typography component="span" variant="caption" color="text.secondary">
                            · {n.matches} gare
                          </Typography>
                        </Typography>
                        <Select
                          size="small"
                          value={targetValue(t)}
                          onChange={(e) => changeName(n.name, e.target.value)}
                          disabled={request.isPending}
                          inputProps={{ "aria-label": `Abbinamento di ${n.name}` }}
                        >
                          <ListSubheader>Nostre squadre</ListSubheader>
                          {preview.ourTeams.map((o) => (
                            <MenuItem key={o.id} value={`ours:${o.id}`}>
                              {o.name} (nostra)
                            </MenuItem>
                          ))}
                          <ListSubheader>Avversarie</ListSubheader>
                          <MenuItem value="new">Nuova avversaria: {n.name}</MenuItem>
                          {preview.opponents.map((o) => (
                            <MenuItem key={o.id} value={`opp:${o.id}`}>
                              {o.name}
                            </MenuItem>
                          ))}
                          <ListSubheader>Altro</ListSubheader>
                          <MenuItem value="skip">Non importare le sue gare</MenuItem>
                        </Select>
                      </Box>
                    );
                  })}
                </Stack>
                {preview.ourTeams.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Nessuna nostra squadra nella stagione del girone.
                  </Typography>
                )}
              </Box>

              {/* Riepilogo */}
              <Typography variant="body2">
                {preview.summary.create} nuove · {preview.summary.update} da aggiornare ·{" "}
                {preview.summary.same} già uguali
                {preview.summary.conflict > 0 && ` · ${preview.summary.conflict} punteggi diversi`}
                {preview.summary.skip > 0 && ` · ${preview.summary.skip} saltate`}
              </Typography>

              {conflicts.length > 0 && (
                <Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                    Punteggi diversi da quelli inseriti
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Di default resta il punteggio già salvato. Spunta le gare per cui vale quello
                    del foglio.
                  </Typography>
                  {conflicts.map((r) => (
                    <FormControlLabel
                      key={r.number}
                      sx={{ display: "flex", ml: 0, mr: 0 }}
                      control={
                        <Checkbox
                          checked={useSheet.has(r.number)}
                          onChange={(e) => toggleSheetScore(r.number, e.target.checked)}
                          disabled={request.isPending}
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {r.home} – {r.away}: salvato {r.existingScore ?? "—"}, foglio {score(r)}
                        </Typography>
                      }
                    />
                  ))}
                </Box>
              )}

              {/* Gare */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="h6" component="h3">
                    Gare
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={onlyChanges}
                        onChange={(e) => setOnlyChanges(e.target.checked)}
                      />
                    }
                    label="Solo quelle che cambiano"
                  />
                </Box>
                {rows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Il girone è già allineato al foglio.
                  </Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 420 }}>
                    <Table size="small" stickyHeader aria-label="Gare del foglio">
                      <TableHead>
                        <TableRow>
                          <TableCell>G.</TableCell>
                          <TableCell>Data</TableCell>
                          <TableCell>Partita</TableCell>
                          <TableCell align="center">Ris.</TableCell>
                          <TableCell>Cosa succede</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.number}>
                            <TableCell>{r.matchday}</TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {format(new Date(r.date), "d MMM yy HH:mm", { locale: it })}
                              {r.dateFixed && " *"}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight:
                                    r.kind === "ours" ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                                }}
                              >
                                {r.home} – {r.away}
                              </Typography>
                              {r.forfait && (
                                <Typography variant="caption" color="text.secondary">
                                  Forfait
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {score(r)}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {ACTION_LABEL[r.action]}
                                {r.kind === "ours" &&
                                  r.action !== "skip" &&
                                  ` · ${r.isHome ? "in casa" : "in trasferta"}, in Partite`}
                              </Typography>
                              {(r.changes.length > 0 || r.skipReason) && (
                                <Typography variant="caption" color="text.secondary">
                                  {r.skipReason ?? r.changes.join(", ")}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} disabled={request.isPending}>
          Annulla
        </Button>
        {preview && (
          <Button
            variant="contained"
            onClick={() => run(names, useSheet, true)}
            disabled={request.isPending || toWrite === 0}
          >
            {toWrite === 0 ? "Niente da importare" : `Importa ${toWrite} gare`}
          </Button>
        )}
      </DialogActions>
    </ResponsiveDialog>
  );
}
