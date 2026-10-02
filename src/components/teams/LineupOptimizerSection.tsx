"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  Stack,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
  Alert,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HeightIcon from "@mui/icons-material/Height";
import { roleColorSx } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import { displayLevel, formationStrength } from "@/lib/rating/staffLevel";
import { optimizeLineup } from "@/lib/rating/lineupOptimizer";
import type { CandidateInput } from "@/lib/matches/callupStats";
import type { LineupResult, RoleDepthEntry } from "@/lib/rating/lineupOptimizer";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

// Divario di livello fra titolare e riserva oltre il quale si avvisa del rischio di falli
const GAP_WARNING_THRESHOLD = 6;

interface Props {
  selectedCandidates: CandidateInput[];
  opponentMu: number | null;
}

export default function LineupOptimizerSection({ selectedCandidates, opponentMu }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const selectedKey = selectedCandidates.map((c) => `${c.kind}-${c.id}`).join(",");
  const result = useMemo(
    () => optimizeLineup(selectedCandidates, opponentMu),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedKey, opponentMu]
  );

  const eligibleCount = selectedCandidates.filter((c) => c.sportRole != null).length;

  return (
    <Paper elevation={0} variant="outlined" sx={{ mt: 3, overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "action.hover",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <AutoAwesomeIcon sx={{ fontSize: 18, color: "primary.main" }} />
        <Typography
          variant="subtitle2"
          fontWeight={FONT_WEIGHT.bold}
          sx={{ flex: 1, letterSpacing: "0.02em" }}
        >
          Analisi della formazione
        </Typography>
        {result && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {result.feasibleCount} formazioni possibili
          </Typography>
        )}
        <IconButton
          size="small"
          sx={{ p: 0 }}
          aria-label={expanded ? "Comprimi analisi formazione" : "Espandi analisi formazione"}
          aria-expanded={expanded}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {eligibleCount < 6 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Seleziona almeno 6 giocatori con ruolo assegnato per visualizzare l&apos;analisi.
            </Typography>
          ) : result === null || result.feasibleCount === 0 ? (
            <Alert severity="warning" sx={{ fontSize: TYPE_SCALE.sm }}>
              Con questi convocati non c&apos;è una formazione regolare. Controlla i ruoli 1 e 2, la
              somma dei ruoli (massimo 23) e il genere nei ruoli 4 e 5.
            </Alert>
          ) : (
            <Stack spacing={2.5}>
              {/* Formazione ottimale */}
              <BestLineupCard lineup={result.topLineups[0]} opponentMu={opponentMu} />

              {/* Alternative */}
              {result.topLineups.length > 1 && (
                <Box>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                    onClick={() => setShowAlternatives((v) => !v)}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={FONT_WEIGHT.semibold}
                      color="text.secondary"
                    >
                      {result.topLineups.length - 1} alternativ
                      {result.topLineups.length - 1 === 1 ? "a" : "e"}
                    </Typography>
                    {showAlternatives ? (
                      <ExpandLessIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    )}
                  </Box>
                  <Collapse in={showAlternatives}>
                    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                      {result.topLineups.slice(1).map((l, i) => (
                        <AlternativeLineupCard key={i} lineup={l} rank={i + 2} />
                      ))}
                    </Stack>
                  </Collapse>
                </Box>
              )}

              <Divider />

              {/* Profondità per ruolo */}
              <RoleDepthPanel entries={result.roleDepth} />
            </Stack>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Best lineup card ──────────────────────────────────────────────────────────

/**
 * Chip della forza di una formazione: il solo numero di livello che lo staff
 * vede (UX-40), mai accanto a un nome.
 */
function StrengthChip({
  lineup,
  opponentMu,
  short = false,
}: {
  lineup: LineupResult;
  opponentMu?: number | null;
  /** Nelle alternative, dove il chip si ripete: solo "Forza 28". */
  short?: boolean;
}) {
  const strength = formationStrength(lineup.muSum, lineup.players.length);
  const name = short ? "Forza" : "Forza della formazione";
  return (
    <Tooltip title="Media del livello stimato dei sei in campo. Il livello si ricava dai risultati delle partitelle: tutti partono da 25. Lo vede solo lo staff.">
      <Chip
        label={
          opponentMu != null
            ? `${name} ${strength} · avversario ${displayLevel(opponentMu)}`
            : `${name} ${strength}`
        }
        size="small"
        sx={{ fontSize: TYPE_SCALE.xs, height: 20 }}
      />
    </Tooltip>
  );
}

function BestLineupCard({
  lineup,
  opponentMu,
}: {
  lineup: LineupResult;
  opponentMu: number | null;
}) {
  const winPct = lineup.winProbability;
  const winLabel =
    winPct == null
      ? null
      : winPct >= 0.6
        ? "Favoriti"
        : winPct <= 0.4
          ? "Sfavoriti"
          : "Equilibrata";

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        <Typography variant="overline" fontWeight={FONT_WEIGHT.bold} color="text.secondary">
          Formazione consigliata
        </Typography>
        <StrengthChip lineup={lineup} opponentMu={opponentMu} />
        {winLabel && (
          <Chip
            label={`${Math.round((winPct ?? 0) * 100)}% · ${winLabel}`}
            size="small"
            sx={{
              fontSize: TYPE_SCALE.xs,
              height: 20,
              // Valenza generica (UX-29): success / warning / error, non gli esiti.
              bgcolor: (theme) =>
                alpha(
                  winLabel === "Favoriti"
                    ? theme.palette.success.main
                    : winLabel === "Sfavoriti"
                      ? theme.palette.error.main
                      : theme.palette.warning.main,
                  0.12
                ),
              color:
                winLabel === "Favoriti"
                  ? "success.main"
                  : winLabel === "Sfavoriti"
                    ? "error.main"
                    : "warning.main",
            }}
          />
        )}
      </Box>
      <Stack spacing={0.75}>
        {[...lineup.players]
          .sort((a, b) => (a.sportRole ?? 99) - (b.sportRole ?? 99))
          .map((p) => (
            <PlayerRow key={`${p.kind}-${p.id}`} player={p} />
          ))}
      </Stack>
    </Box>
  );
}

// ── Alternative lineup card ───────────────────────────────────────────────────

function AlternativeLineupCard({ lineup, rank }: { lineup: LineupResult; rank: number }) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ p: 1.5, bgcolor: (theme) => alpha(theme.palette.action.hover, 0.4) }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold} color="text.secondary">
          #{rank}
        </Typography>
        <StrengthChip lineup={lineup} short />
        {lineup.winProbability != null && (
          <Typography variant="caption" color="text.secondary">
            {Math.round(lineup.winProbability * 100)}% vittoria
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {[...lineup.players]
          .sort((a, b) => (a.sportRole ?? 99) - (b.sportRole ?? 99))
          .map((p) => (
            <Chip
              key={`${p.kind}-${p.id}`}
              avatar={
                <Avatar
                  src={p.image ?? undefined}
                  sx={{ bgcolor: "action.selected", color: "text.primary" }}
                >
                  {p.name[0]}
                </Avatar>
              }
              label={p.name.split(" ")[0]}
              size="small"
              sx={{ fontSize: TYPE_SCALE.xs, height: 26 }}
            />
          ))}
      </Box>
    </Paper>
  );
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerRow({ player: p }: { player: CandidateInput }) {
  // Niente numero accanto al nome: si dice solo se il livello non c'è ancora,
  // perché in quel caso nella forza della formazione vale quello di partenza.
  const hasRating = p.ratingMu != null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Avatar
        src={p.image ?? undefined}
        sx={{
          width: 28,
          height: 28,
          fontSize: TYPE_SCALE.xs,
          // Neutro (UX-29): il ruolo lo dice il RoleBadge.
          bgcolor: "action.selected",
          color: "text.primary",
        }}
      >
        {p.name[0]}
      </Avatar>
      <Typography
        variant="body2"
        fontWeight={FONT_WEIGHT.semibold}
        sx={{ flex: 1, fontSize: TYPE_SCALE.sm }}
      >
        {p.name}
      </Typography>
      {p.sportRole && <RoleBadge role={p.sportRole} variant={p.sportRoleVariant} />}
      {!hasRating && (
        <Tooltip title="Non ha ancora partitelle con il punteggio: nella forza della formazione vale il livello di partenza.">
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
            non ancora valutato
          </Typography>
        </Tooltip>
      )}
      {p.height != null && (
        <Tooltip title={`Altezza: ${p.height} cm`}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <HeightIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: TYPE_SCALE.xs }}>
              {p.height}
            </Typography>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

// ── Role depth panel ──────────────────────────────────────────────────────────

function RoleDepthPanel({ entries }: { entries: RoleDepthEntry[] }) {
  return (
    <Box>
      <Typography
        variant="overline"
        fontWeight={FONT_WEIGHT.bold}
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        Titolari e riserve per ruolo
      </Typography>
      <Stack spacing={1}>
        {entries.map((entry) => (
          <RoleDepthRow key={entry.role} entry={entry} />
        ))}
      </Stack>
    </Box>
  );
}

function RoleDepthRow({ entry }: { entry: RoleDepthEntry }) {
  const gapWarning = entry.gap != null && entry.gap > GAP_WARNING_THRESHOLD;
  const noBackup = entry.inLineup.length > 0 && entry.onBench.length === 0;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        p: 1,
        borderRadius: RADIUS.md,
        bgcolor: (theme) =>
          gapWarning || noBackup ? alpha(theme.palette.error.main, 0.08) : "transparent",
      }}
    >
      {/* Role chip */}
      <Chip
        label={`R${entry.role}`}
        size="small"
        sx={{
          ...roleColorSx(entry.role),
          fontSize: TYPE_SCALE.xs,
          height: 20,
          minWidth: 32,
          flexShrink: 0,
        }}
      />

      {/* Titolari */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flex: 1 }}>
        {entry.inLineup.map((p) => (
          <Chip
            key={`${p.kind}-${p.id}`}
            label={p.name.split(" ")[0]}
            size="small"
            sx={{
              fontSize: TYPE_SCALE.xs,
              height: 22,
              bgcolor: "action.selected",
              color: "text.primary",
            }}
          />
        ))}
      </Box>

      {/* Separatore → */}
      {entry.inLineup.length > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: "22px", flexShrink: 0 }}
        >
          →
        </Typography>
      )}

      {/* Riserve */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flex: 1 }}>
        {entry.onBench.length === 0 ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {noBackup && entry.inLineup.length > 0 && (
              <WarningAmberIcon sx={{ fontSize: 14, color: "error.main" }} />
            )}
            <Typography
              variant="caption"
              color={noBackup ? "error.main" : "text.secondary"}
              fontWeight={noBackup ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular}
            >
              {entry.inLineup.length === 0 ? "—" : "nessuna riserva"}
            </Typography>
          </Box>
        ) : (
          entry.onBench.map((p) => (
            <Chip
              key={`${p.kind}-${p.id}`}
              label={p.name.split(" ")[0]}
              size="small"
              sx={{
                fontSize: TYPE_SCALE.xs,
                height: 22,
                bgcolor: "action.hover",
                color: "text.secondary",
              }}
            />
          ))
        )}
      </Box>

      {/* Gap warning */}
      {gapWarning && entry.gap != null && (
        <Tooltip title="Il titolare è molto più forte della riserva: con il cambio c'è rischio di falli.">
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
            <WarningAmberIcon sx={{ fontSize: 14, color: "error.main" }} />
            <Typography
              variant="caption"
              color="error.main"
              fontWeight={FONT_WEIGHT.semibold}
              sx={{ fontSize: TYPE_SCALE.xs }}
            >
              divario alto
            </Typography>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}
