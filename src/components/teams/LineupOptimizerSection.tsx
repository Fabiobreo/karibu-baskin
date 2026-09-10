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
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { TRUESKILL } from "@/lib/rating/trueskill";
import { optimizeLineup } from "@/lib/rating/lineupOptimizer";
import type { CandidateInput } from "@/lib/matches/callupStats";
import type { LineupResult, RoleDepthEntry } from "@/lib/rating/lineupOptimizer";

// Gap μ oltre il quale scatta il warning rischio falli
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
        <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1, letterSpacing: "0.02em" }}>
          Analisi Formazione
        </Typography>
        {result && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {result.feasibleCount} formazioni valide
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
            <Alert severity="warning" sx={{ fontSize: "0.82rem" }}>
              Nessuna formazione valida trovata. Controlla i vincoli regolamentari (R1/R2 esclusivi,
              somma ruoli ≤ 23, genere su R4/R5).
            </Alert>
          ) : (
            <Stack spacing={2.5}>
              {/* Formazione ottimale */}
              <BestLineupCard lineup={result.topLineups[0]} />

              {/* Alternative */}
              {result.topLineups.length > 1 && (
                <Box>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                    onClick={() => setShowAlternatives((v) => !v)}
                  >
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      {result.topLineups.length - 1} alternativ
                      {result.topLineups.length - 1 === 1 ? "a" : "e"}
                    </Typography>
                    {showAlternatives ? (
                      <ExpandLessIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 16, color: "text.disabled" }} />
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

function BestLineupCard({ lineup }: { lineup: LineupResult }) {
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Typography
          variant="overline"
          fontWeight={800}
          color="primary.onLight"
          sx={{ letterSpacing: "0.08em" }}
        >
          Formazione Ottimale
        </Typography>
        <Chip
          label={`Σμ ${lineup.muSum.toFixed(1)}`}
          size="small"
          sx={{ fontWeight: 700, fontSize: "0.68rem", height: 20 }}
        />
        {winLabel && (
          <Chip
            label={`${Math.round((winPct ?? 0) * 100)}% · ${winLabel}`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: "0.68rem",
              height: 20,
              bgcolor:
                winLabel === "Favoriti"
                  ? "match.winBg"
                  : winLabel === "Sfavoriti"
                    ? "match.lossBg"
                    : (theme) => alpha(theme.palette.warning.main, 0.12),
              color:
                winLabel === "Favoriti"
                  ? "match.win"
                  : winLabel === "Sfavoriti"
                    ? "match.loss"
                    : "warning.dark",
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
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          #{rank}
        </Typography>
        <Chip
          label={`Σμ ${lineup.muSum.toFixed(1)}`}
          size="small"
          sx={{ fontWeight: 600, fontSize: "0.65rem", height: 18 }}
        />
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
            <Tooltip
              key={`${p.kind}-${p.id}`}
              title={`μ ${(p.ratingMu ?? TRUESKILL.MU).toFixed(1)}`}
            >
              <Chip
                avatar={
                  <Avatar
                    src={p.image ?? undefined}
                    sx={{ bgcolor: p.sportRole ? ROLE_COLORS[p.sportRole] : "grey.400" }}
                  >
                    {p.name[0]}
                  </Avatar>
                }
                label={p.name.split(" ")[0]}
                size="small"
                sx={{ fontSize: "0.72rem", fontWeight: 600, height: 26 }}
              />
            </Tooltip>
          ))}
      </Box>
    </Paper>
  );
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerRow({ player: p }: { player: CandidateInput }) {
  const mu = (p.ratingMu ?? TRUESKILL.MU).toFixed(1);
  const roleColor = p.sportRole ? ROLE_COLORS[p.sportRole] : "grey.400";
  const hasRating = p.ratingMu != null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Avatar
        src={p.image ?? undefined}
        sx={{ width: 28, height: 28, fontSize: 11, bgcolor: roleColor }}
      >
        {p.name[0]}
      </Avatar>
      <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: "0.84rem" }}>
        {p.name}
      </Typography>
      {p.sportRole && (
        <Chip
          label={sportRoleLabel(p.sportRole, p.sportRoleVariant)}
          size="small"
          sx={{
            bgcolor: roleColor,
            color: "common.white",
            fontWeight: 700,
            fontSize: "0.6rem",
            height: 18,
          }}
        />
      )}
      <Tooltip title={hasRating ? `Rating TrueSkill μ=${mu}` : "Non ancora valutato (μ default)"}>
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            minWidth: 38,
            textAlign: "right",
            color: hasRating ? "text.primary" : "text.disabled",
            fontStyle: hasRating ? "normal" : "italic",
          }}
        >
          μ {mu}
        </Typography>
      </Tooltip>
      {p.height != null && (
        <Tooltip title={`Altezza: ${p.height} cm`}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <HeightIcon sx={{ fontSize: 13, color: "text.disabled" }} />
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
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
        fontWeight={800}
        color="text.secondary"
        sx={{ letterSpacing: "0.08em", display: "block", mb: 1 }}
      >
        Profondità per Ruolo
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
        borderRadius: 1,
        bgcolor: gapWarning || noBackup ? "match.lossBg" : "transparent",
      }}
    >
      {/* Role chip */}
      <Chip
        label={`R${entry.role}`}
        size="small"
        sx={{
          bgcolor: ROLE_COLORS[entry.role],
          color: "common.white",
          fontWeight: 700,
          fontSize: "0.68rem",
          height: 20,
          minWidth: 32,
          flexShrink: 0,
        }}
      />

      {/* Titolari */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flex: 1 }}>
        {entry.inLineup.map((p) => (
          <Tooltip key={`${p.kind}-${p.id}`} title={`μ ${(p.ratingMu ?? TRUESKILL.MU).toFixed(1)}`}>
            <Chip
              label={`${p.name.split(" ")[0]} ${(p.ratingMu ?? TRUESKILL.MU).toFixed(0)}`}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 22,
                bgcolor: (theme) =>
                  alpha(ROLE_COLORS[entry.role] ?? theme.palette.primary.main, 0.15),
                color: "text.primary",
              }}
            />
          </Tooltip>
        ))}
      </Box>

      {/* Separatore → */}
      {entry.inLineup.length > 0 && (
        <Typography
          variant="caption"
          color="text.disabled"
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
              <WarningAmberIcon sx={{ fontSize: 14, color: "match.loss" }} />
            )}
            <Typography
              variant="caption"
              color={noBackup ? "match.loss" : "text.disabled"}
              fontWeight={noBackup ? 700 : 400}
            >
              {entry.inLineup.length === 0 ? "—" : "nessuna riserva"}
            </Typography>
          </Box>
        ) : (
          entry.onBench.map((p) => (
            <Tooltip
              key={`${p.kind}-${p.id}`}
              title={`μ ${(p.ratingMu ?? TRUESKILL.MU).toFixed(1)}`}
            >
              <Chip
                label={`${p.name.split(" ")[0]} ${(p.ratingMu ?? TRUESKILL.MU).toFixed(0)}`}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  height: 22,
                  bgcolor: "action.hover",
                  color: "text.secondary",
                }}
              />
            </Tooltip>
          ))
        )}
      </Box>

      {/* Gap warning */}
      {gapWarning && entry.gap != null && (
        <Tooltip title="Gap elevato: rischio falli (titolare molto più forte della riserva)">
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
            <WarningAmberIcon sx={{ fontSize: 14, color: "match.loss" }} />
            <Typography
              variant="caption"
              color="match.loss"
              fontWeight={700}
              sx={{ fontSize: "0.68rem" }}
            >
              −{entry.gap.toFixed(1)}
            </Typography>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}
