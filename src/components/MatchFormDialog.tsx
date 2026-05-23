"use client";

import {
  Autocomplete,
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Chip,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { MatchType } from "@prisma/client";
import { seasonForDate } from "@/components/SessionRestrictionEditor";

export type MatchFormTeam = {
  id: string;
  name: string;
  season: string;
  color: string | null;
};
export type MatchFormOpposingTeam = { id: string; name: string; city: string | null };
export type MatchFormGroup = {
  id: string;
  name: string;
  season: string;
  championship: string | null;
  competitiveTeamIds: string[];
};
export type MatchFormMatch = {
  id: string;
  teamId: string;
  opponentId: string | null;
  opponentTeamId?: string | null;
  date: Date | string;
  isHome: boolean;
  venue: string | null;
  matchType: MatchType;
  notes: string | null;
  matchday: number | null;
  groupId: string | null;
};

const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

const matchFormSchema = z.object({
  teamId: z.string().min(1, "Seleziona una squadra"),
  date: z.string().min(1, "Data obbligatoria"),
  isHome: z.boolean(),
  venue: z.string(),
  matchType: z.nativeEnum({
    LEAGUE: "LEAGUE",
    TOURNAMENT: "TOURNAMENT",
    FRIENDLY: "FRIENDLY",
  } as const),
  notes: z.string(),
  matchday: z.string(),
  groupId: z.string(),
});

type MatchFormValues = z.infer<typeof matchFormSchema>;

const defaultMatchValues: MatchFormValues = {
  teamId: "",
  date: "",
  isHome: true,
  venue: "",
  matchType: "LEAGUE",
  notes: "",
  matchday: "",
  groupId: "",
};

type OpponentOpt =
  | {
      kind: "external";
      id: string;
      name: string;
      city: string | null;
      groupKey: "external";
    }
  | {
      kind: "internal";
      id: string;
      name: string;
      season: string;
      groupKey: "internal";
    }
  | { kind: "new"; name: string; groupKey: "new" };

interface Props {
  open: boolean;
  onClose: () => void;
  editMatch: MatchFormMatch | null;
  teams: MatchFormTeam[];
  opponents: MatchFormOpposingTeam[];
  groups: MatchFormGroup[];
  onOpponentCreated: (opp: MatchFormOpposingTeam) => void;
  onSaved: (saved: MatchFormMatch, isEdit: boolean) => void;
}

export default function MatchFormDialog({
  open,
  onClose,
  editMatch,
  teams,
  opponents,
  groups,
  onOpponentCreated,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    reset: resetMatchForm,
    watch,
    setValue,
    control,
    formState: { errors: matchErrors, isSubmitting: isMatchSubmitting },
  } = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: defaultMatchValues,
  });
  const watchDate = watch("date");
  const watchTeamId = watch("teamId");
  const teamsForForm = teams.filter((t) => t.season === seasonForDate(watchDate ?? ""));
  const displayTeams = teamsForForm.length > 0 ? teamsForForm : teams;
  const [error, setError] = useState("");
  const [opponentValue, setOpponentValue] = useState<OpponentOpt | null>(null);
  const [opponentInput, setOpponentInput] = useState("");
  const [opponentError, setOpponentError] = useState<string | null>(null);
  const [newCity, setNewCity] = useState("");

  const opponentOptions: OpponentOpt[] = [
    ...opponents.map(
      (o): OpponentOpt => ({
        kind: "external",
        id: o.id,
        name: o.name,
        city: o.city,
        groupKey: "external",
      })
    ),
    ...teams
      .filter((t) => t.id !== watchTeamId)
      .map(
        (t): OpponentOpt => ({
          kind: "internal",
          id: t.id,
          name: t.name,
          season: t.season,
          groupKey: "internal",
        })
      ),
  ];

  const isInternal = opponentValue?.kind === "internal";

  useEffect(() => {
    if (!open) return;
    setError("");
    setOpponentError(null);
    setNewCity("");
    setOpponentInput("");

    if (editMatch) {
      resetMatchForm({
        teamId: editMatch.teamId,
        date: format(new Date(editMatch.date), "yyyy-MM-dd'T'HH:mm"),
        isHome: editMatch.isHome,
        venue: editMatch.venue ?? "",
        matchType: editMatch.matchType,
        notes: editMatch.notes ?? "",
        matchday: editMatch.matchday !== null ? String(editMatch.matchday) : "",
        groupId: editMatch.groupId ?? "",
      });

      if (editMatch.opponentTeamId) {
        const t = teams.find((x) => x.id === editMatch.opponentTeamId);
        if (t) {
          setOpponentValue({
            kind: "internal",
            id: t.id,
            name: t.name,
            season: t.season,
            groupKey: "internal",
          });
        }
      } else if (editMatch.opponentId) {
        const o = opponents.find((x) => x.id === editMatch.opponentId);
        if (o) {
          setOpponentValue({
            kind: "external",
            id: o.id,
            name: o.name,
            city: o.city,
            groupKey: "external",
          });
        }
      } else {
        setOpponentValue(null);
      }
    } else {
      resetMatchForm(defaultMatchValues);
      setOpponentValue(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMatch, resetMatchForm]);

  const handleSave = rhfHandleSubmit(async (values) => {
    setError("");
    setOpponentError(null);

    if (!opponentValue) {
      setOpponentError("Seleziona o crea la squadra avversaria");
      return;
    }
    if (opponentValue.kind === "internal" && opponentValue.id === values.teamId) {
      setOpponentError("Una squadra non può giocare contro se stessa");
      return;
    }
    if (opponentValue.kind === "new" && !opponentValue.name.trim()) {
      setOpponentError("Nome avversaria obbligatorio");
      return;
    }

    let opponentId: string | null = null;
    let opponentTeamId: string | null = null;
    const internal = opponentValue.kind === "internal";

    if (opponentValue.kind === "external") {
      opponentId = opponentValue.id;
    } else if (opponentValue.kind === "internal") {
      opponentTeamId = opponentValue.id;
    } else {
      const res = await fetch("/api/opposing-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: opponentValue.name.trim(),
          city: newCity.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("Errore creazione avversaria");
        return;
      }
      const created = (await res.json()) as MatchFormOpposingTeam;
      onOpponentCreated(created);
      opponentId = created.id;
    }

    const payload = {
      teamId: values.teamId,
      opponentId,
      opponentTeamId,
      date: values.date,
      isHome: values.isHome,
      venue: values.venue || null,
      matchType: internal ? "FRIENDLY" : values.matchType,
      notes: values.notes || null,
      matchday: values.matchday !== "" ? Number(values.matchday) : null,
      groupId: internal ? null : values.groupId || null,
    };

    const method = editMatch ? "PUT" : "POST";
    const url = editMatch ? `/api/matches/${editMatch.id}` : "/api/matches";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      setError(errData.error ?? "Errore nel salvataggio");
      return;
    }
    const saved = (await res.json()) as MatchFormMatch;
    onSaved(saved, !!editMatch);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{editMatch ? "Modifica partita" : "Nuova partita"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Controller
            name="teamId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth required error={!!matchErrors.teamId}>
                <InputLabel>Nostra squadra</InputLabel>
                <Select {...field} label="Nostra squadra">
                  {displayTeams.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: t.color ?? "primary.main",
                          }}
                        />
                        {t.name}
                        {teamsForForm.length === 0 && ` — ${t.season}`}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {matchErrors.teamId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {matchErrors.teamId.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          <Box>
            <Autocomplete<OpponentOpt, false, false, false>
              value={opponentValue}
              onChange={(_, val) => {
                setOpponentValue(val);
                setOpponentError(null);
              }}
              inputValue={opponentInput}
              onInputChange={(_, val, reason) => {
                if (reason !== "reset") setOpponentInput(val);
              }}
              options={opponentOptions}
              groupBy={(opt) => {
                if (opt.kind === "external") return "Squadre avversarie";
                if (opt.kind === "internal") return "Nostre squadre (amichevole interna)";
                return "";
              }}
              getOptionLabel={(opt) => opt.name}
              isOptionEqualToValue={(a, b) =>
                a.kind === b.kind && "id" in a && "id" in b && a.id === b.id
              }
              filterOptions={(options, params) => {
                const input = params.inputValue.trim().toLowerCase();
                const filtered = options.filter((o) => o.name.toLowerCase().includes(input));
                if (input.length > 0 && !options.some((o) => o.name.toLowerCase() === input)) {
                  filtered.push({
                    kind: "new",
                    name: params.inputValue.trim(),
                    groupKey: "new",
                  });
                }
                return filtered;
              }}
              renderOption={(props, opt) => {
                const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
                  key: string;
                };
                if (opt.kind === "new") {
                  return (
                    <li key={key} {...rest}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AddIcon fontSize="small" color="primary" />
                        <Typography variant="body2">
                          Crea nuova avversaria: <strong>{opt.name}</strong>
                        </Typography>
                      </Box>
                    </li>
                  );
                }
                if (opt.kind === "internal") {
                  return (
                    <li key={key} {...rest}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">{opt.name}</Typography>
                        <Chip
                          label="interna"
                          size="small"
                          color="primary"
                          sx={{ fontSize: "0.62rem", height: 18, fontWeight: 700 }}
                        />
                      </Box>
                    </li>
                  );
                }
                return (
                  <li key={key} {...rest}>
                    <Box>
                      <Typography variant="body2">{opt.name}</Typography>
                      {opt.city && (
                        <Typography variant="caption" color="text.secondary">
                          {opt.city}
                        </Typography>
                      )}
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Avversario"
                  required
                  error={!!opponentError}
                  helperText={
                    opponentError ??
                    "Cerca tra le esistenti, scegli una nostra squadra per amichevole interna, oppure digita un nome nuovo"
                  }
                  placeholder="es. Basket Vicenza"
                />
              )}
            />
            {opponentValue?.kind === "new" && (
              <TextField
                label="Città (opzionale)"
                size="small"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                fullWidth
                sx={{ mt: 1.5 }}
                placeholder="es. Vicenza"
              />
            )}
            {isInternal && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Amichevole interna: la partita non avrà tipo campionato né girone.
              </Alert>
            )}
          </Box>

          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Data e ora"
                type="datetime-local"
                fullWidth
                error={!!matchErrors.date}
                helperText={matchErrors.date?.message}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(e) => {
                  const newDate = e.target.value;
                  field.onChange(newDate);
                  const newSeason = seasonForDate(newDate);
                  const validTeams = teams.filter((t) => t.season === newSeason);
                  const currentTeamId = watch("teamId");
                  if (!validTeams.some((t) => t.id === currentTeamId) && validTeams[0]) {
                    setValue("teamId", validTeams[0].id);
                  }
                }}
              />
            )}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <Controller
              name="matchType"
              control={control}
              render={({ field }) => (
                <FormControl sx={{ flex: 1 }} disabled={isInternal}>
                  <InputLabel>Tipo</InputLabel>
                  <Select {...field} label="Tipo">
                    {(Object.keys(MATCH_TYPE_LABELS) as MatchType[]).map((k) => (
                      <MenuItem key={k} value={k}>
                        {MATCH_TYPE_LABELS[k]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="isHome"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {field.value ? (
                        <HomeIcon fontSize="small" />
                      ) : (
                        <FlightIcon fontSize="small" />
                      )}
                      <Typography variant="body2">{field.value ? "Casa" : "Trasferta"}</Typography>
                    </Box>
                  }
                />
              )}
            />
          </Box>

          <TextField
            label="Campo / Palestra"
            {...register("venue")}
            fullWidth
            placeholder="Palasport di Montecchio"
          />

          {!isInternal &&
            groups.filter((g) => !watch("teamId") || g.competitiveTeamIds.includes(watch("teamId")))
              .length > 0 && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <Controller
                  name="groupId"
                  control={control}
                  render={({ field }) => (
                    <FormControl sx={{ flex: 2 }}>
                      <InputLabel shrink>Girone</InputLabel>
                      <Select {...field} label="Girone" notched displayEmpty>
                        <MenuItem value="">
                          <em>Nessun girone</em>
                        </MenuItem>
                        {groups
                          .filter(
                            (g) =>
                              !watch("teamId") || g.competitiveTeamIds.includes(watch("teamId"))
                          )
                          .map((g) => (
                            <MenuItem key={g.id} value={g.id}>
                              {g.name} {g.championship ? `(${g.championship})` : ""} — {g.season}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <TextField
                  label="Giornata"
                  type="number"
                  {...register("matchday")}
                  sx={{ flex: 1 }}
                  slotProps={{ htmlInput: { min: 1 } }}
                  placeholder="es. 3"
                />
              </Box>
            )}

          <TextField label="Note" {...register("notes")} fullWidth multiline rows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isMatchSubmitting}
          startIcon={isMatchSubmitting ? <CircularProgress size={16} /> : undefined}
        >
          {editMatch ? "Salva" : "Aggiungi partita"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
