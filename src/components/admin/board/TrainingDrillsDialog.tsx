"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/context/ToastContext";
import { fetchJson, readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import { bibMeta } from "@/lib/bib";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";
import { assignSlots } from "@/lib/board/assign";
import type { DrillContent } from "@/lib/board/content";
import { DRILL_COURT_LABELS, DRILL_KIND_LABELS } from "@/lib/board/labels";
import type { TrainingDrillItem } from "@/lib/board/trainingDrills";
import {
  opponentKey,
  slotTeam,
  trainingTeamKeys,
  type TrainingTeamKey,
} from "@/lib/board/trainingNames";
import type { DrillAssignments } from "@/lib/schemas/drill";
import type { TeamsData } from "@/lib/schemas/session";

interface LibraryDrill {
  id: string;
  title: string;
  kind: TrainingDrillItem["kind"];
  court: TrainingDrillItem["court"];
  durationMin: number | null;
  content: DrillContent;
}

interface Item {
  drillId: string;
  title: string;
  kind: TrainingDrillItem["kind"];
  court: TrainingDrillItem["court"];
  durationMin: number | null;
  content: DrillContent;
  note: string;
  assignments: DrillAssignments;
  published: boolean;
}

const TEAM_LABELS: Record<TrainingTeamKey, string> = {
  teamA: "Arancioni",
  teamB: "Neri",
  teamC: "Bianchi",
};

interface TrainingDrillsDialogProps {
  sessionId: string;
  sessionTitle: string;
  onClose: () => void;
}

/**
 * Scaletta di un allenamento (UX-72): quali schemi della lavagna, in che
 * ordine, con una nota; per ogni squadra chi va su quale pedina (proposto in
 * automatico, si cambia con un menu). Un solo salvataggio.
 */
export default function TrainingDrillsDialog({
  sessionId,
  sessionTitle,
  onClose,
}: TrainingDrillsDialogProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = useQuery<TrainingDrillItem[]>({
    queryKey: ["training-drills", sessionId],
    queryFn: () => fetchJson(`/api/sessions/${sessionId}/drills`),
  });
  const library = useQuery<LibraryDrill[]>({
    queryKey: ["drills", "published"],
    queryFn: () => fetchJson("/api/drills"),
  });
  const teamsQuery = useQuery<TeamsData | null>({
    queryKey: ["teams", sessionId],
    queryFn: () => fetchJson(`/api/teams/${sessionId}`),
  });
  const teams = teamsQuery.data?.generated === false ? null : (teamsQuery.data ?? null);

  // La scaletta salvata diventa lo stato del dialog la prima volta che arriva.
  const list: Item[] =
    items ??
    (current.data ?? []).map((d) => ({
      drillId: d.drillId,
      title: d.title,
      kind: d.kind,
      court: d.court,
      durationMin: d.durationMin,
      content: d.content,
      note: d.note ?? "",
      assignments: d.assignments ?? {},
      published: d.published,
    }));
  const update = (fn: (l: Item[]) => Item[]) => setItems(fn(list));

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/drills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          list.map((i) => ({ drillId: i.drillId, note: i.note, assignments: i.assignments }))
        ),
      });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: () => {
      showToast({ message: "Scaletta salvata", severity: "success" });
      void queryClient.invalidateQueries({ queryKey: ["training-drills", sessionId] });
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const available = (library.data ?? []).filter((d) => !list.some((i) => i.drillId === d.id));
  const loading = current.isLoading || library.isLoading;

  return (
    <ResponsiveDialog open onClose={() => !save.isPending && onClose()} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Scaletta: {sessionTitle}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress aria-label="Caricamento" />
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
            <Autocomplete
              options={available}
              getOptionLabel={(d) => d.title}
              groupBy={(d) => DRILL_KIND_LABELS[d.kind]}
              value={null}
              blurOnSelect
              clearOnBlur
              onChange={(_, d) =>
                d &&
                update((l) => [
                  ...l,
                  {
                    drillId: d.id,
                    title: d.title,
                    kind: d.kind,
                    court: d.court,
                    durationMin: d.durationMin,
                    content: d.content,
                    note: "",
                    assignments: {},
                    published: true,
                  },
                ])
              }
              noOptionsText="Nessuno schema pubblicato da aggiungere"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Aggiungi dalla lavagna"
                  placeholder="Cerca per titolo"
                />
              )}
            />

            {list.length === 0 ? (
              <Typography color="text.secondary">
                Nessuno schema in scaletta. I tesserati vedono la sezione &ldquo;Cosa facciamo
                oggi&rdquo; solo quando ce n&apos;è almeno uno.
              </Typography>
            ) : (
              list.map((item, index) => (
                <DrillRow
                  key={item.drillId}
                  item={item}
                  index={index}
                  total={list.length}
                  teams={teams}
                  sessionId={sessionId}
                  onChange={(next) => update((l) => l.map((x, i) => (i === index ? next : x)))}
                  onMove={(delta) =>
                    update((l) => {
                      const copy = [...l];
                      [copy[index], copy[index + delta]] = [copy[index + delta], copy[index]];
                      return copy;
                    })
                  }
                  onRemove={() => update((l) => l.filter((_, i) => i !== index))}
                />
              ))
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Annulla
        </Button>
        <Button
          variant="contained"
          onClick={() => save.mutate()}
          disabled={save.isPending || loading}
        >
          Salva scaletta
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}

function DrillRow({
  item,
  index,
  total,
  teams,
  sessionId,
  onChange,
  onMove,
  onRemove,
}: {
  item: Item;
  index: number;
  total: number;
  teams: TeamsData | null;
  sessionId: string;
  onChange: (next: Item) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const keys = trainingTeamKeys(teams);
  const [attack, setAttack] = useState<TrainingTeamKey | null>(keys[0] ?? null);
  const defense = attack ? opponentKey(teams, attack) : null;
  const seed = `${sessionId}:${item.drillId}`;
  const slots = assignSlots(item.content, {
    attack: slotTeam(teams, attack),
    defense: slotTeam(teams, defense),
    assignments: item.assignments,
    seed,
  });
  const rolePieces = item.content.pieces.filter((p) => p.kind === "role");

  /** Mette `athleteId` sulla pedina; chi c'era va dove era lui (scambio). */
  function assign(pieceId: string, side: "attack" | "defense", athleteId: string) {
    const teamKey = side === "attack" ? attack : defense;
    if (!teamKey) return;
    const sidePieces = rolePieces.filter((p) => p.side === side).map((p) => p.id);
    const mapping: Record<string, string> = {};
    for (const id of sidePieces) if (slots[id]) mapping[id] = slots[id].id;
    const previous = mapping[pieceId];
    const other = sidePieces.find((id) => mapping[id] === athleteId && id !== pieceId);
    mapping[pieceId] = athleteId;
    if (other) {
      if (previous) mapping[other] = previous;
      else delete mapping[other];
    }
    onChange({
      ...item,
      assignments: { ...item.assignments, [teamKey]: { ...item.assignments[teamKey], ...mapping } },
    });
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: RADIUS.lg, display: "grid", gap: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
            {index + 1}. {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {DRILL_KIND_LABELS[item.kind]} · {DRILL_COURT_LABELS[item.court]}
            {item.durationMin ? ` · ${item.durationMin} min` : ""}
            {!item.published && " · non più pubblicato: i tesserati non lo vedono"}
          </Typography>
        </Box>
        <IconButton
          aria-label={`Sposta prima ${item.title}`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
        >
          <ArrowUpwardIcon />
        </IconButton>
        <IconButton
          aria-label={`Sposta dopo ${item.title}`}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
        >
          <ArrowDownwardIcon />
        </IconButton>
        <IconButton
          aria-label={`Togli ${item.title} dalla scaletta`}
          onClick={onRemove}
          sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <TextField
        size="small"
        label="Nota per i ragazzi"
        placeholder="10 minuti, poi cambio"
        value={item.note}
        onChange={(e) => onChange({ ...item, note: e.target.value })}
        slotProps={{ htmlInput: { maxLength: 140 } }}
      />

      {rolePieces.length > 0 &&
        (keys.length < 1 ? (
          <Typography variant="body2" color="text.secondary">
            Chi va dove si sceglie quando ci sono le squadre.
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="body2" component="span">
                Chi va dove, in attacco:
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={attack}
                onChange={(_, v: TrainingTeamKey | null) => v && setAttack(v)}
                aria-label="Squadra in attacco"
              >
                {keys.map((k) => (
                  <ToggleButton key={k} value={k} sx={{ minHeight: 40 }}>
                    {bibMeta(k).name}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              {defense && (
                <Typography variant="body2" color="text.secondary" component="span">
                  in difesa {bibMeta(defense).name}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { sm: "1fr 1fr" } }}>
              {rolePieces.map((p) => {
                const side = p.side === "defense" ? "defense" : "attack";
                const team = slotTeam(teams, side === "attack" ? attack : defense);
                if (!team) return null;
                return (
                  <TextField
                    key={p.id}
                    select
                    size="small"
                    label={`Ruolo ${p.role}, ${side === "attack" ? "attacco" : "difesa"}`}
                    value={slots[p.id]?.id ?? ""}
                    onChange={(e) => assign(p.id, side, e.target.value)}
                  >
                    <MenuItem value="" disabled>
                      Nessuno con questo ruolo
                    </MenuItem>
                    {team.athletes.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name} (ruolo {a.role})
                      </MenuItem>
                    ))}
                  </TextField>
                );
              })}
            </Box>
          </Box>
        ))}
    </Paper>
  );
}
