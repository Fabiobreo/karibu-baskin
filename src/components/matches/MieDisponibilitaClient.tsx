"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Typography,
  Box,
  Button,
  Collapse,
  Paper,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import EmptyState from "@/components/common/EmptyState";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlightIcon from "@mui/icons-material/Flight";
import { format, isToday, isTomorrow } from "date-fns";
import type { Locale } from "date-fns";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { useToast } from "@/context/ToastContext";
import type { MatchType } from "@prisma/client";
import { readError } from "@/lib/fetchJson";

export interface AvailabilityEntity {
  kind: "user" | "child";
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  teamColor: string | null;
  available: boolean | null;
}

export interface AvailabilityMatch {
  matchId: string;
  slug: string | null;
  date: string;
  isHome: boolean;
  venue: string | null;
  matchType: MatchType;
  opponentLabel: string;
  entities: AvailabilityEntity[];
}

interface Props {
  initialMatches: AvailabilityMatch[];
}

function entityKey(matchId: string, entity: AvailabilityEntity) {
  return `${matchId}:${entity.kind}:${entity.id}`;
}

function formatShortDate(
  iso: string,
  tCommon: ReturnType<typeof useTranslations>,
  dateLocale: Locale
): string {
  const d = new Date(iso);
  if (isToday(d)) return `${tCommon("today")} · ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `${tCommon("tomorrow")} · ${format(d, "HH:mm")}`;
  return format(d, "EEE d MMM · HH:mm", { locale: dateLocale });
}

export default function MieDisponibilitaClient({ initialMatches }: Props) {
  // initialMatches è stabile (props dal Server Component) → calcolo una volta sola.
  const [{ futureMatches, pastMatches }] = useState(() => {
    const now = Date.now();
    const future: AvailabilityMatch[] = [];
    const past: AvailabilityMatch[] = [];
    for (const m of initialMatches) {
      if (new Date(m.date).getTime() > now) future.push(m);
      else past.push(m);
    }
    future.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { futureMatches: future, pastMatches: past };
  });

  // Valori salvati localmente (optimistic update sopra entity.available)
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  // Salvataggi in corso (toggle disabilitato nel frattempo)
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [showPast, setShowPast] = useState(false);
  const { showToast } = useToast();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  function effectiveValue(matchId: string, entity: AvailabilityEntity): boolean | null {
    const k = entityKey(matchId, entity);
    if (overrides.has(k)) return overrides.get(k)!;
    return entity.available;
  }

  // Salvataggio immediato al toggle, con rollback in caso di errore
  async function handleChange(matchId: string, entity: AvailabilityEntity, value: boolean | null) {
    if (value === null) return;
    const k = entityKey(matchId, entity);
    if (savingKeys.has(k)) return;
    const prev = overrides.has(k) ? overrides.get(k)! : entity.available;
    if (value === prev) return;

    setOverrides((m) => new Map(m).set(k, value));
    setSavingKeys((s) => new Set(s).add(k));
    try {
      const body: { available: boolean; childId?: string } = { available: value };
      if (entity.kind === "child") body.childId = entity.id;
      const res = await fetch(`/api/matches/${matchId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const message = await readError(res);
        throw new Error(message);
      }
      showToast({ message: t("availabilitiesSaved", { count: 1 }), severity: "success" });
    } catch (err) {
      setOverrides((m) => {
        const next = new Map(m);
        if (prev === null) next.delete(k);
        else next.set(k, prev);
        return next;
      });
      showToast({
        message: err instanceof Error ? err.message : tCommon("error"),
        severity: "error",
      });
    } finally {
      setSavingKeys((s) => {
        const next = new Set(s);
        next.delete(k);
        return next;
      });
    }
  }

  return (
    <>
      {/* Microcopy operativa: dice cosa fare, quando si salva e cosa succede
          se non rispondi. Sta in cima apposta. */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, display: "block" }}>
        {t("availabilitiesDesc")}
      </Typography>

      {initialMatches.length === 0 ? (
        <EmptyState
          icon={<EventBusyIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
          title={t("noMatchesForTeams")}
          message={t("noMatchesForTeamsDesc")}
        />
      ) : (
        <>
          {futureMatches.length === 0 ? (
            <EmptyState
              icon={<EventBusyIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
              title={t("noUpcomingMatches")}
              message={t("noUpcomingMatchesDesc")}
            />
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                fontWeight={800}
                color="primary.onLight"
                sx={{ letterSpacing: "0.08em", display: "block", mb: 1 }}
              >
                {t("upcoming")} ({futureMatches.length})
              </Typography>
              {futureMatches.map((m) => (
                <CompactMatchRow
                  key={m.matchId}
                  match={m}
                  isPast={false}
                  effectiveValue={effectiveValue}
                  isSaving={(e) => savingKeys.has(entityKey(m.matchId, e))}
                  onChange={handleChange}
                />
              ))}
            </Box>
          )}

          {/* Le concluse non sono azionabili: undici righe di pulsanti spenti
              spingevano giu' la parte utile. Restano a un clic di distanza. */}
          {pastMatches.length > 0 && (
            <Box>
              <Button
                onClick={() => setShowPast((v) => !v)}
                size="small"
                aria-expanded={showPast}
                startIcon={<HistoryIcon sx={{ fontSize: "1rem !important" }} />}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transform: showPast ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                }
                sx={{ fontWeight: 700 }}
              >
                {showPast
                  ? t("hidePastMatches")
                  : t("showPastMatches", { count: pastMatches.length })}
              </Button>
              <Collapse in={showPast} unmountOnExit>
                <Box sx={{ mt: 1.5 }}>
                  {pastMatches.map((m) => (
                    <CompactMatchRow
                      key={m.matchId}
                      match={m}
                      isPast={true}
                      effectiveValue={effectiveValue}
                      isSaving={() => false}
                      onChange={() => {}}
                    />
                  ))}
                </Box>
              </Collapse>
            </Box>
          )}
        </>
      )}
    </>
  );
}

interface CompactMatchRowProps {
  match: AvailabilityMatch;
  isPast: boolean;
  effectiveValue: (matchId: string, entity: AvailabilityEntity) => boolean | null;
  isSaving: (entity: AvailabilityEntity) => boolean;
  onChange: (matchId: string, entity: AvailabilityEntity, value: boolean | null) => void;
}

function CompactMatchRow({
  match: m,
  isPast,
  effectiveValue,
  isSaving,
  onChange,
}: CompactMatchRowProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const dateLocale = useActiveDateLocale();
  const { matchTypeLabel } = useEntityLabels();
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1.25,
        mb: 1,
        // Le concluse restano informazione da leggere: prima erano al 50% di
        // opacita', cioe' avversario e squadra sotto qualunque soglia.
        bgcolor: isPast ? "action.hover" : "background.paper",
      }}
    >
      {/* Header compatto su una riga */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, flexWrap: "wrap" }}>
        {m.isHome ? (
          <HomeIcon sx={{ fontSize: 14, color: "text.disabled" }} />
        ) : (
          <FlightIcon sx={{ fontSize: 14, color: "text.disabled" }} />
        )}
        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.88rem" }}>
          vs {m.opponentLabel}
        </Typography>
        {/* Etichetta per esteso: "Amich." e "Camp." non si capiscono. */}
        <Chip
          label={matchTypeLabel(m.matchType)}
          size="small"
          sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700 }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: "auto", fontWeight: 600, fontSize: "0.72rem" }}
        >
          {formatShortDate(m.date, tCommon, dateLocale)}
        </Typography>
      </Box>

      {/* Entità: una riga ciascuna */}
      {m.entities.map((entity) => {
        const value = effectiveValue(m.matchId, entity);
        const saving = isSaving(entity);
        return (
          <Box
            key={`${entity.kind}-${entity.id}`}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              py: 0.25,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flex: 1 }}>
              {m.entities.length > 1 && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: entity.teamColor ?? "primary.main",
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                variant="body2"
                fontWeight={500}
                noWrap
                sx={{ fontSize: "0.82rem" }}
                title={`${entity.name} · ${entity.teamName}`}
              >
                {m.entities.length > 1 ? entity.name : entity.teamName}
              </Typography>
              {saving && <CircularProgress size={12} sx={{ flexShrink: 0 }} />}
            </Box>
            {isPast ? (
              // Niente pulsanti spenti: la risposta data si legge come testo.
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  flexShrink: 0,
                  color:
                    value === true
                      ? "match.win"
                      : value === false
                        ? "match.loss"
                        : "text.secondary",
                }}
              >
                {value === true
                  ? t("answeredYes")
                  : value === false
                    ? t("answeredNo")
                    : t("answeredNone")}
              </Typography>
            ) : (
              <ToggleButtonGroup
                value={value}
                exclusive
                size="small"
                disabled={saving}
                onChange={(_, v) => {
                  if (v === null) return; // ignora deselezione (non si può tornare a "non risposto")
                  onChange(m.matchId, entity, v as boolean);
                }}
                sx={{
                  "& .MuiToggleButton-root": {
                    py: 0.25,
                    px: 1,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "none",
                    border: "1px solid",
                    borderColor: "divider",
                  },
                }}
              >
                <ToggleButton
                  value={true}
                  sx={{
                    "&.Mui-selected": {
                      bgcolor: "match.win",
                      color: "common.white",
                    },
                  }}
                >
                  <EventAvailableIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  {tCommon("yes")}
                </ToggleButton>
                <ToggleButton
                  value={false}
                  sx={{
                    "&.Mui-selected": {
                      bgcolor: "match.loss",
                      color: "common.white",
                    },
                  }}
                >
                  <EventBusyIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  {tCommon("no")}
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>
        );
      })}
    </Paper>
  );
}
