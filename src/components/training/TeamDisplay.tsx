"use client";
import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid2 as Grid,
  Chip,
  Skeleton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Checkbox,
  CircularProgress,
  FormControlLabel,
} from "@mui/material";
import Link from "next/link";
import GroupsIcon from "@mui/icons-material/Groups";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ROLES, TEAM_META, bibFill } from "@/lib/constants";
import MembersOnlyNotice from "@/components/common/MembersOnlyNotice";
import { bibSurfaceSx } from "@/lib/bib";
import { useToast } from "@/context/ToastContext";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import QueryErrorState from "@/components/common/QueryErrorState";
import TeamsView, { type ViewerMarks } from "@/components/training/TeamBoard";
import TeamBalanceBar, { BandMark, type TeamLevels } from "@/components/training/TeamBalanceBar";
import { useQuery } from "@tanstack/react-query";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import { assignmentOf, notifiedAssignmentOf, teamChanges } from "@/lib/trainingTeams";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

import { GENERIC_ERROR_IT, errorText } from "@/lib/networkError";
/**
 * Colore della squadra come riempimento sotto un'etichetta bianca: l'arancio
 * #E65100 col bianco fa 3,78:1, quindi si scurisce quanto basta (UX-22).
 */

export interface TeamAthlete {
  id: string;
  name: string;
  role: number;
}

export interface TeamsData {
  teamA: TeamAthlete[];
  teamB: TeamAthlete[];
  teamC?: TeamAthlete[];
  coaches?: { id: string; name: string }[];
  numTeams: 2 | 3;
  generated: boolean;
}

interface Props {
  sessionId: string;
  isStaff?: boolean;
  registrationIds?: string[];
  coaches?: { id: string; name: string }[];
  slugMap?: Record<string, string>; // reg.id → user.slug
  /** Iscrizioni di chi guarda e dei suoi figli: "Tu" / "Famiglia" nel tabellone. */
  viewerMarks?: ViewerMarks;
  editMode?: boolean; // controllato dal parent (via TeamsHeader)
  isEnded?: boolean; // allenamento già concluso: cambia il messaggio "nessuna squadra"
  onExitEditMode?: () => void;
  // Stato squadre gestito dal parent
  teams: TeamsData | null;
  teamsLoading: boolean;
  /** La lettura delle squadre è fallita. Senza questo, `teams === null` verrebbe
   *  reso come "squadre non pubblicate", che è un'affermazione diversa e per lo
   *  staff porterebbe a rigenerare squadre che invece esistono già. */
  teamsLoadFailed?: boolean;
  onTeamsRetry?: () => void;
  /** Visitatore non autenticato: le squadre non gli vengono servite. Senza
   *  questo, `teams === null` diventerebbe "squadre non pubblicate", che è
   *  falso quando invece esistono e semplicemente non le stiamo mostrando. */
  restricted?: false | "anonymous" | "guest";
  onTeamsGenerated: (teams: TeamsData) => void;
  /** Tutti gli atleti iscritti (non allenatori). Se presente, l'editor mostra
   *  "Da assegnare" con chi non sta in nessuna squadra, e si può togliere un
   *  giocatore da una squadra: serve a comporre le squadre a mano. */
  athletes?: TeamAthlete[];
  /** Se presente, il pannello di creazione offre anche "Componi a mano":
   *  squadre vuote e subito in modifica. */
  onEnterEditMode?: () => void;
  /** Chiamata prima di creare le squadre (es. per salvare le presenze ancora
   *  in sospeso, che il server usa per escludere gli assenti). */
  beforeGenerate?: () => Promise<void>;
  /** Livelli già noti (stories). Senza, allo staff li chiede il server (UX-54). */
  levels?: TeamLevels;
}

// ── Team Editor (spostamento manuale, solo staff) ─────────────────────────────

type TeamKey = "teamA" | "teamB" | "teamC";
/** "pool" = gli iscritti che non stanno in nessuna squadra. */
type SlotKey = TeamKey | "pool";

interface TeamEditorProps {
  teams: TeamsData;
  sessionId: string;
  athletes?: TeamAthlete[];
  /** Livello stimato degli iscritti: fasce e anteprima dell'equilibrio (solo staff). */
  levels?: TeamLevels;
  /** Allenamento finito: nessun avviso parte, quindi niente spunta. */
  isEnded?: boolean;
  onTeamsUpdated: (teams: TeamsData) => void;
  onDone: () => void;
}

function TeamEditor({
  teams: initialTeams,
  sessionId,
  athletes,
  levels,
  isEnded = false,
  onTeamsUpdated,
  onDone,
}: TeamEditorProps) {
  const t = useTranslations("trainings");
  const { teamColorLabel } = useEntityLabels();
  const [localTeams, setLocalTeams] = useState<TeamsData>(initialTeams);
  // Selezione multipla: gli id scelti, anche da gruppi diversi.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  // Le squadre di quando l'editor è stato aperto: su "Fatto" si avvisa solo
  // chi, rispetto a queste, è entrato o ha cambiato squadra (UX-54).
  const [startAssignment] = useState(() => assignmentOf(initialTeams));
  const [notify, setNotify] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const teamKeys: TeamKey[] =
    localTeams.numTeams === 3 ? ["teamA", "teamB", "teamC"] : ["teamA", "teamB"];
  const meta = TEAM_META.slice(0, teamKeys.length);

  const assignedIds = new Set(teamKeys.flatMap((k) => (localTeams[k] ?? []).map((a) => a.id)));
  const pool = athletes?.filter((a) => !assignedIds.has(a.id)) ?? [];
  const listOf = (key: SlotKey) => (key === "pool" ? pool : (localTeams[key] ?? []));

  const slotKeys: SlotKey[] = ["pool", ...teamKeys];
  const hasSelection = selected.size > 0;
  /** C'è almeno un selezionato fuori da questo gruppo: lì si può spostare. */
  const canMoveInto = (key: SlotKey) =>
    slotKeys.some((k) => k !== key && listOf(k).some((a) => selected.has(a.id)));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** Le squadre dopo aver spostato i selezionati in `toKey` (null se nessuno si muove). */
  function afterMove(toKey: SlotKey): TeamsData | null {
    // Chi è già nel gruppo di destinazione resta dov'è.
    const moving = slotKeys
      .filter((k) => k !== toKey)
      .flatMap((k) => listOf(k).filter((a) => selected.has(a.id)));
    if (moving.length === 0) return null;
    const movingIds = new Set(moving.map((a) => a.id));
    // "Da assegnare" non si salva: è chi manca dalle squadre.
    const next: TeamsData = { ...localTeams };
    for (const k of teamKeys) {
      const kept = (localTeams[k] ?? []).filter((a) => !movingIds.has(a.id));
      next[k] = k === toKey ? [...kept, ...moving] : kept;
    }
    return next;
  }

  async function moveTo(toKey: SlotKey) {
    if (saving) return;
    const newTeams = afterMove(toKey);
    if (!newTeams) return;
    const prevTeams = localTeams;

    setLocalTeams(newTeams);
    setSelected(new Set());
    setSaving(true);

    try {
      const res = await fetch(`/api/teams/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeams),
      });
      if (res.ok) {
        const saved: TeamsData = await res.json();
        onTeamsUpdated(saved);
        setLocalTeams(saved);
      } else {
        setLocalTeams(prevTeams);
        showToast({ message: "Errore nel salvataggio", severity: "error" });
      }
    } catch (err) {
      setLocalTeams(prevTeams);
      showToast({ message: errorText(err, GENERIC_ERROR_IT), severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  function chipLabel(a: TeamAthlete, isSelected: boolean) {
    const band = levels?.[a.id]?.band;
    if (!band) return a.name;
    return (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
        {a.name}
        <BandMark band={band} inherit={isSelected} />
      </Box>
    );
  }

  // Anteprima dell'equilibrio per ogni squadra in cui si possono spostare i selezionati.
  const previews = levels
    ? teamKeys.flatMap((key, i) => {
        const next = canMoveInto(key) ? afterMove(key) : null;
        return next ? [{ targetIndex: i, teams: teamKeys.map((k) => next[k] ?? []) }] : [];
      })
    : [];

  // Il server avvisa rispetto all'ultimo avviso, se lo tiene: il conteggio
  // della spunta parte dallo stesso punto.
  const pending = teamChanges(
    notifiedAssignmentOf(localTeams) ?? startAssignment,
    assignmentOf(localTeams)
  );
  const pendingCount = isEnded ? 0 : pending.added.length + pending.moved.length;

  async function finish() {
    if (notify && pendingCount > 0) {
      setFinishing(true);
      try {
        const res = await fetch(`/api/teams/${sessionId}/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ before: startAssignment }),
        });
        if (!res.ok) throw new Error(await readError(res));
        showToast({ message: t("editorNotified"), severity: "success" });
      } catch (err) {
        showToast({ message: errorText(err, GENERIC_ERROR_IT), severity: "error" });
        setFinishing(false);
        return;
      }
    }
    onDone();
  }

  return (
    <Box>
      {levels && (
        <TeamBalanceBar
          teams={teamKeys.map((k) => localTeams[k] ?? [])}
          levels={levels}
          previews={previews}
        />
      )}
      <Box sx={{ mb: 1.5, minHeight: 30, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="text.secondary" aria-live="polite">
          {hasSelection ? t("editorMoveTarget", { count: selected.size }) : t("editorMoveHint")}
        </Typography>
        {hasSelection && (
          <Button
            size="small"
            variant="text"
            disabled={saving}
            onClick={() => setSelected(new Set())}
            sx={{ typography: "caption", py: 0.25 }}
          >
            {t("editorClearSelection")}
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {athletes && (
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box
              sx={{
                px: 2,
                py: 1,
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 42,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography component="h3" variant="subtitle2">
                  {t("editorUnassigned")}
                </Typography>
                <Chip
                  label={pool.length}
                  size="small"
                  sx={{ height: 20, fontSize: TYPE_SCALE.xs }}
                />
              </Box>
              {canMoveInto("pool") && (
                <Button
                  size="small"
                  variant="outlined"
                  disabled={saving}
                  onClick={() => moveTo("pool")}
                  sx={{ fontSize: TYPE_SCALE.xs, py: 0.25, minWidth: 90 }}
                >
                  {saving ? <CircularProgress size={14} color="inherit" /> : t("editorRemove")}
                </Button>
              )}
            </Box>
            <Box sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {ROLES.flatMap((role) =>
                pool
                  .filter((a) => a.role === role)
                  .map((a) => {
                    const isSelected = selected.has(a.id);
                    return (
                      <Chip
                        key={a.id}
                        label={chipLabel(a, isSelected)}
                        size="small"
                        disabled={saving}
                        aria-pressed={isSelected}
                        onClick={() => toggle(a.id)}
                        sx={{
                          fontSize: TYPE_SCALE.xs,
                          // Selezionato = arancio (UX-29); il ruolo non ha tinta.
                          bgcolor: isSelected ? "primary.fill" : "action.hover",
                          color: isSelected ? "common.white" : "text.primary",
                          border: "1px solid",
                          borderColor: isSelected ? "primary.fill" : "divider",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: isSelected ? "primary.fill" : "action.selected",
                          },
                        }}
                      />
                    );
                  })
              )}
              {pool.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                  {t("editorAllAssigned")}
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {teamKeys.map((key, i) => {
          const teamList = localTeams[key] ?? [];
          const m = meta[i];
          const canMoveTo = canMoveInto(key);

          return (
            <Paper key={key} variant="outlined" sx={{ overflow: "hidden" }}>
              {/* Header */}
              <Box
                sx={[
                  {
                    px: 2,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                  bibSurfaceSx(m.key),
                ]}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography component="h3" variant="subtitle2" sx={{ color: "common.white" }}>
                    {teamColorLabel(m.key)}
                  </Typography>
                  <Chip
                    label={teamList.length}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: TYPE_SCALE.xs,
                      color: "common.white",
                      borderColor: "common.white",
                    }}
                  />
                </Box>
                {canMoveTo && (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={saving}
                    onClick={() => moveTo(key)}
                    sx={{
                      bgcolor: "common.white",
                      color: bibFill(m.color),
                      fontSize: TYPE_SCALE.xs,
                      py: 0.25,
                      minWidth: 90,
                      "&:hover": { bgcolor: "grey.100" },
                    }}
                  >
                    {saving ? <CircularProgress size={14} color="inherit" /> : t("editorMoveTo")}
                  </Button>
                )}
              </Box>

              {/* Athletes */}
              <Box sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {ROLES.flatMap((role) =>
                  teamList
                    .filter((a) => a.role === role)
                    .map((a) => {
                      const isSelected = selected.has(a.id);
                      return (
                        <Chip
                          key={a.id}
                          label={chipLabel(a, isSelected)}
                          size="small"
                          disabled={saving}
                          aria-pressed={isSelected}
                          onClick={() => toggle(a.id)}
                          sx={{
                            fontSize: TYPE_SCALE.xs,
                            // Selezionato = arancio (UX-29), come nel gruppo
                            // "Da assegnare"; il ruolo non ha tinta.
                            bgcolor: isSelected ? "primary.fill" : "action.hover",
                            color: isSelected ? "common.white" : "text.primary",
                            border: "1px solid",
                            borderColor: isSelected ? "primary.fill" : "divider",
                            cursor: "pointer",
                            "&:hover": { bgcolor: isSelected ? "primary.fill" : "action.selected" },
                          }}
                        />
                      );
                    })
                )}
                {teamList.length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                    {t("editorNoPlayers")}
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          flexWrap: "wrap",
          columnGap: 1,
          mt: 2,
        }}
      >
        {pendingCount > 0 && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                {pending.initial
                  ? t("editorNotifyInitial")
                  : t("editorNotify", { count: pendingCount })}
              </Typography>
            }
          />
        )}
        <Button
          variant="outlined"
          size="small"
          onClick={finish}
          disabled={saving || finishing}
          startIcon={finishing ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {t("editorDone")}
        </Button>
      </Box>
    </Box>
  );
}

// ── TeamDisplay ───────────────────────────────────────────────────────────────

export default function TeamDisplay({
  sessionId,
  isStaff,
  registrationIds,
  coaches,
  slugMap = {},
  viewerMarks,
  editMode = false,
  isEnded = false,
  onExitEditMode,
  teams,
  teamsLoading,
  teamsLoadFailed = false,
  onTeamsRetry,
  restricted = false,
  onTeamsGenerated,
  athletes,
  onEnterEditMode,
  beforeGenerate,
  levels: givenLevels,
}: Props) {
  const t = useTranslations("trainings");
  const [generating, setGenerating] = useState(false);
  const [numTeams, setNumTeams] = useState<2 | 3>(teams?.numTeams ?? 2);
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  // Livello stimato degli iscritti: solo allenatori e admin (la GET risponde
  // 403 a tutti gli altri). Si richiede quando cambiano gli iscritti.
  const levelsQuery = useQuery({
    // Gli id, non il numero: uno che esce e uno che entra lasciano il numero uguale.
    queryKey: ["team-levels", sessionId, [...(registrationIds ?? [])].sort().join(",")],
    queryFn: async (): Promise<TeamLevels> => {
      const res = await fetch(`/api/teams/${sessionId}/levels`);
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()).levels;
    },
    enabled: !!isStaff && !!teams && !givenLevels,
    staleTime: 60_000,
    retry: false,
  });
  const levels = givenLevels ?? (isStaff ? levelsQuery.data : undefined);
  const bands = levels
    ? Object.fromEntries(Object.entries(levels).map(([id, l]) => [id, l.band]))
    : undefined;

  async function handleGenerate() {
    setGenerating(true);
    try {
      await beforeGenerate?.();
      const res = await fetch(`/api/teams/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // "Ricrea da capo" tiene il numero di squadre salvato: lo stato locale
        // nasce prima che le squadre arrivino e resterebbe a 2.
        body: JSON.stringify({ numTeams: teams?.numTeams ?? numTeams }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: TeamsData = await res.json();
      onTeamsGenerated(data);
      setNumTeams(data.numTeams);
      onExitEditMode?.();
      showToast({ message: "Squadre create con successo!", severity: "success" });
    } catch (err) {
      showToast({
        message: errorText(err, "Qualcosa non ha funzionato. Riprova."),
        severity: "error",
      });
    } finally {
      setGenerating(false);
    }
  }

  // Squadre vuote salvate subito, poi l'editor: lo staff le compone a mano
  // spostando i giocatori da "Da assegnare".
  async function handleCreateEmpty() {
    setGenerating(true);
    const empty: TeamsData = {
      teamA: [],
      teamB: [],
      ...(numTeams === 3 ? { teamC: [] } : {}),
      coaches: coaches ?? [],
      numTeams,
      generated: true,
    };
    try {
      const res = await fetch(`/api/teams/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empty),
      });
      if (res.ok) {
        onTeamsGenerated(await res.json());
        onEnterEditMode?.();
      } else {
        showToast({ message: "Errore nella creazione", severity: "error" });
      }
    } catch (err) {
      showToast({ message: errorText(err, GENERIC_ERROR_IT), severity: "error" });
    } finally {
      setGenerating(false);
    }
  }

  // Chi è iscritto ma non in squadra (arrivato dopo) e chi è in squadra ma
  // non più iscritto (o segnato assente): si sistemano senza ricreare (UX-54).
  const inTeams = assignmentOf(teams);
  const currentIds = new Set(registrationIds ?? []);
  const missingIds = registrationIds?.filter((id) => !inTeams[id]) ?? [];
  const removedCount = registrationIds
    ? Object.keys(inTeams).filter((id) => !currentIds.has(id)).length
    : 0;
  const registrationsChanged = !!teams && (missingIds.length > 0 || removedCount > 0);
  const athleteName = new Map((athletes ?? []).map((a) => [a.id, a.name]));
  const missingNames = missingIds.flatMap((id) => athleteName.get(id) ?? []);

  async function handleAddLate() {
    setGenerating(true);
    try {
      // Come per la creazione: le presenze appena segnate prima, così il
      // server toglie dalle squadre chi è assente.
      await beforeGenerate?.();
      const res = await fetch(`/api/teams/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "add" }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onTeamsGenerated(await res.json());
      showToast({ message: t("teamsLateDone"), severity: "success" });
    } catch (err) {
      showToast({ message: errorText(err, GENERIC_ERROR_IT), severity: "error" });
    } finally {
      setGenerating(false);
    }
  }

  function confirmRecreate() {
    openConfirm(t("teamsRecreateConfirmTitle"), t("teamsRecreateConfirmBody"), handleGenerate, {
      confirmLabel: t("teamsRecreateConfirm"),
      confirmColor: "primary",
    });
  }

  if (restricted) {
    return (
      <Box sx={{ py: 3, px: 3, textAlign: "center" }}>
        <MembersOnlyNotice viewer={restricted} what="teams" />
      </Box>
    );
  }

  // L'errore precede il caricamento: dopo che i tentativi si sono esauriti
  // `teamsLoading` torna false e senza questo ramo si cadrebbe negli stati
  // "nessuna squadra", che qui significherebbe il contrario del vero.
  if (teamsLoadFailed) {
    return <QueryErrorState message={t("teamsLoadError")} onRetry={onTeamsRetry} />;
  }

  if (teamsLoading) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rectangular" height={160} sx={{ borderRadius: RADIUS.lg }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rectangular" height={160} sx={{ borderRadius: RADIUS.lg }} />
        </Grid>
      </Grid>
    );
  }

  // Staff senza squadre create → pannello di creazione
  if (!teams && isStaff) {
    return (
      <Box
        sx={{
          py: 3,
          px: 3,
          textAlign: "center",
          borderRadius: RADIUS.md,
          border: "1px dashed",
          borderColor: "primary.main",
          backgroundColor: "background.paper",
        }}
      >
        <GroupsIcon sx={{ fontSize: 36, color: "primary.main", mb: 1 }} />
        <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold} gutterBottom>
          {t("teamsCreate")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {registrationIds?.length
            ? t("teamsAthleteCount", { count: registrationIds.length })
            : t("teamsChooseCount")}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <ToggleButtonGroup
            value={numTeams}
            exclusive
            size="small"
            onChange={(_e, val) => {
              if (val) setNumTeams(val as 2 | 3);
            }}
          >
            {/* 44px: si usa dal telefono, a bordo campo (UX-13). */}
            <ToggleButton value={2} sx={{ px: 3, minHeight: 44, fontWeight: FONT_WEIGHT.semibold }}>
              {t("teams2")}
            </ToggleButton>
            <ToggleButton value={3} sx={{ px: 3, minHeight: 44, fontWeight: FONT_WEIGHT.semibold }}>
              {t("teams3")}
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || !registrationIds?.length}
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <GroupsIcon />}
            sx={{ minHeight: 44 }}
          >
            {generating ? t("teamsCreating") : t("teamsCreateBtn")}
          </Button>

          {onEnterEditMode && (
            <Button
              variant="text"
              size="small"
              onClick={handleCreateEmpty}
              disabled={generating || !registrationIds?.length}
              sx={{ minHeight: 44 }}
            >
              {t("teamsCreateManual")}
            </Button>
          )}

          {!registrationIds?.length && (
            <Typography variant="caption" color="text.secondary">
              {t("teamsNoAthletes")}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Nessuna squadra, utente normale: una riga sotto il titolo della sezione,
  // senza riquadro (UX-38: lo stato vuoto non pesa piu' del contenuto).
  if (!teams) {
    return (
      <Typography variant="body2" color="text.secondary">
        {isEnded ? t("teamsNotPublishedPastDesc") : t("teamsNotPublishedDesc")}
      </Typography>
    );
  }

  return (
    <Box>
      {ConfirmDialog}
      {/* Iscritti cambiati (solo staff, non in modifica): prima si aggiunge
          chi manca senza toccare gli altri, ricreare è la seconda scelta. */}
      {isStaff && registrationsChanged && !editMode && (
        <Alert severity="warning" icon={<WarningAmberIcon fontSize="inherit" />} sx={{ mb: 2 }}>
          {missingIds.length > 0 && (
            <Typography variant="body2">
              {missingNames.length === missingIds.length
                ? t("teamsLateMissing", {
                    count: missingIds.length,
                    names: missingNames.join(", "),
                  })
                : t("teamsLateMissingCount", { count: missingIds.length })}
            </Typography>
          )}
          {removedCount > 0 && (
            <Typography variant="body2">
              {t("teamsLateRemoved", { count: removedCount })}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
            <Button
              color="warning"
              size="small"
              variant="contained"
              onClick={handleAddLate}
              disabled={generating}
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ minHeight: 40 }}
            >
              {missingIds.length > 0 ? t("teamsLateAdd") : t("teamsLateUpdate")}
            </Button>
            <Button
              color="warning"
              size="small"
              variant="text"
              onClick={confirmRecreate}
              disabled={generating}
              sx={{ minHeight: 40 }}
            >
              {t("teamsRecreateFromScratch")}
            </Button>
          </Box>
        </Alert>
      )}

      {levels && !editMode && (
        <TeamBalanceBar
          teams={[
            teams.teamA ?? [],
            teams.teamB ?? [],
            ...((teams.numTeams ?? (teams.teamC?.length ? 3 : 2)) === 3 ? [teams.teamC ?? []] : []),
          ]}
          levels={levels}
        />
      )}

      {editMode ? (
        <TeamEditor
          teams={teams}
          sessionId={sessionId}
          athletes={athletes}
          levels={levels}
          isEnded={isEnded}
          onTeamsUpdated={(t) => onTeamsGenerated(t)}
          onDone={() => onExitEditMode?.()}
        />
      ) : (
        <TeamsView teams={teams} slugMap={slugMap} viewerMarks={viewerMarks} bands={bands} />
      )}

      {/* Allenatori presenti */}
      {coaches && coaches.length > 0 && (
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={FONT_WEIGHT.semibold}
            sx={{ whiteSpace: "nowrap" }}
          >
            {t("teamCoaches")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {coaches.map((c) => {
              const slug = slugMap[c.id];
              return (
                <Chip
                  key={c.id}
                  size="small"
                  label={
                    slug ? (
                      <Link
                        href={`/giocatori/${slug}`}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                          fontWeight: FONT_WEIGHT.semibold,
                        }}
                      >
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )
                  }
                  variant="outlined"
                  sx={{ fontSize: TYPE_SCALE.xs }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
