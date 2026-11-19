"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  ListSubheader,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
} from "@mui/material";
import type { DrillCourt, DrillKind, DrillVisibility } from "@prisma/client";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { canBePublic, kindsOf, type DrillCategory } from "@/lib/board/category";
import {
  DRILL_CATEGORY_LABELS,
  DRILL_COURT_LABELS,
  DRILL_KIND_LABELS,
  DRILL_VISIBILITY_LABELS,
  type AdminDrillRow,
  type DrillTeamOption,
} from "@/lib/board/labels";

interface DrillFormDialogProps {
  open: boolean;
  /** Schema da modificare; null = nuovo (nasce in bozza). */
  drill: Pick<
    AdminDrillRow,
    | "id"
    | "title"
    | "kind"
    | "court"
    | "description"
    | "durationMin"
    | "competitiveTeamId"
    | "visibility"
  > | null;
  /** Per un nuovo elemento: la scheda da cui si parte (esercizio o schema). */
  defaultCategory?: DrillCategory;
  teams: DrillTeamOption[];
  onClose: () => void;
  /** Dopo il salvataggio, con l'id dello schema. */
  onSaved: (saved: { id: string; court: DrillCourt }) => void;
}

/**
 * Nuovo esercizio o schema, o i dettagli di uno esistente (UX-72): titolo,
 * tipo (che decide se e' un esercizio o uno schema), campo, descrizione,
 * durata, squadra di riferimento (solo un filtro) e, per un esercizio, chi lo
 * vede. Il disegno si fa nell'editor.
 */
export default function DrillFormDialog({
  open,
  drill,
  defaultCategory = "plays",
  teams,
  onClose,
  onSaved,
}: DrillFormDialogProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(drill?.title ?? "");
  const [kind, setKind] = useState<DrillKind>(
    drill?.kind ?? (defaultCategory === "exercises" ? "EXERCISE" : "ATTACK")
  );
  const [visibility, setVisibility] = useState<DrillVisibility>(drill?.visibility ?? "MEMBERS");
  const isExercise = canBePublic(kind);
  const noun = isExercise ? "esercizio" : "schema";
  const [court, setCourt] = useState<DrillCourt>(drill?.court ?? "HALF");
  const [description, setDescription] = useState(drill?.description ?? "");
  const [duration, setDuration] = useState(drill?.durationMin ? String(drill.durationMin) : "");
  const [teamId, setTeamId] = useState(drill?.competitiveTeamId ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title,
        kind,
        court,
        description,
        durationMin: duration ? Number(duration) : null,
        competitiveTeamId: teamId || null,
        // Uno schema e' sempre dei tesserati: la rotta lo impone comunque.
        visibility: isExercise ? visibility : "MEMBERS",
      };
      const res = await fetch(drill ? `/api/drills/${drill.id}` : "/api/drills", {
        method: drill ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res));
      const saved = (await res.json()) as { id: string };
      return { id: saved.id, court };
    },
    onSuccess: (saved) => {
      showToast({
        message: drill
          ? "Dettagli salvati"
          : `${isExercise ? "Esercizio" : "Schema"} creato, in bozza`,
        severity: "success",
      });
      onSaved(saved);
    },
    onError: (err) => setError(err.message),
  });

  return (
    <ResponsiveDialog
      open={open}
      onClose={() => !save.isPending && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>
        {drill ? `Dettagli dello ${noun}` : `Nuovo ${noun}`}
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          id="drill-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            save.mutate();
          }}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}
        >
          <TextField
            label="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <FormControl fullWidth>
            <InputLabel id="drill-kind">Tipo</InputLabel>
            <Select
              labelId="drill-kind"
              label="Tipo"
              value={kind}
              onChange={(e) => setKind(e.target.value as DrillKind)}
            >
              {(["exercises", "plays"] as const).flatMap((c) => [
                <ListSubheader key={c}>{DRILL_CATEGORY_LABELS[c]}</ListSubheader>,
                ...kindsOf(c).map((k) => (
                  <MenuItem key={k} value={k}>
                    {DRILL_KIND_LABELS[k]}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
          {isExercise ? (
            <FormControl>
              <FormLabel id="drill-visibility">Chi lo vede, quando è pubblicato</FormLabel>
              <RadioGroup
                aria-labelledby="drill-visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as DrillVisibility)}
              >
                {(["MEMBERS", "PUBLIC"] as const).map((v) => (
                  <FormControlLabel
                    key={v}
                    value={v}
                    control={<Radio />}
                    label={DRILL_VISIBILITY_LABELS[v]}
                    sx={{ minHeight: 44 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          ) : (
            drill?.visibility === "PUBLIC" && (
              <Alert severity="info">
                Uno schema è sempre solo dei tesserati: salvando, non sarà più pubblico.
              </Alert>
            )
          )}
          <FormControl>
            <FormLabel id="drill-court">Campo</FormLabel>
            <RadioGroup
              row
              aria-labelledby="drill-court"
              value={court}
              onChange={(e) => setCourt(e.target.value as DrillCourt)}
            >
              {(Object.keys(DRILL_COURT_LABELS) as DrillCourt[]).map((c) => (
                <FormControlLabel
                  key={c}
                  value={c}
                  control={<Radio />}
                  label={DRILL_COURT_LABELS[c]}
                  sx={{ minHeight: 44 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
          {drill && drill.court === "FULL" && court === "HALF" && (
            <Alert severity="info">
              A metà campo si disegna solo la metà di destra: se ci sono pezzi a sinistra, prima
              spostali nell&apos;editor.
            </Alert>
          )}
          <TextField
            label="Descrizione"
            helperText="Facoltativa: a cosa serve, cosa guardare"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 600 } }}
          />
          <TextField
            label="Durata indicativa (minuti)"
            helperText="Facoltativa, utile per gli esercizi"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 120, inputMode: "numeric" } }}
            sx={{ maxWidth: 260 }}
          />
          <FormControl fullWidth>
            <InputLabel id="drill-team" shrink>
              Squadra di riferimento
            </InputLabel>
            <Select
              labelId="drill-team"
              label="Squadra di riferimento"
              value={teamId}
              displayEmpty
              notched
              onChange={(e) => setTeamId(e.target.value)}
            >
              <MenuItem value="">Nessuna, per tutte</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} ({t.season})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Annulla
        </Button>
        <Button variant="contained" type="submit" form="drill-form" disabled={save.isPending}>
          {drill ? "Salva" : "Crea e disegna"}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
