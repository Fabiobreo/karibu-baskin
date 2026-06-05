"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import SaveIcon from "@mui/icons-material/Save";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";
import type { MatchType } from "@prisma/client";

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

const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  LEAGUE: "Camp.",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amich.",
};

function entityKey(matchId: string, entity: AvailabilityEntity) {
  return `${matchId}:${entity.kind}:${entity.id}`;
}

function formatShortDate(iso: string, tCommon: ReturnType<typeof useTranslations>): string {
  const d = new Date(iso);
  if (isToday(d)) return `${tCommon("today")} · ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `${tCommon("tomorrow")} · ${format(d, "HH:mm")}`;
  return format(d, "EEE d MMM · HH:mm", { locale: it });
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

  // Mappa delle modifiche locali: key -> nuovo valore (true/false)
  const [drafts, setDrafts] = useState<Map<string, boolean>>(new Map());
  // Valori confermati dal server dopo un salvataggio (sovrascrivono entity.available)
  const [savedOverrides, setSavedOverrides] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  function effectiveValue(matchId: string, entity: AvailabilityEntity): boolean | null {
    const k = entityKey(matchId, entity);
    if (drafts.has(k)) return drafts.get(k)!;
    if (savedOverrides.has(k)) return savedOverrides.get(k)!;
    return entity.available;
  }

  function setDraft(matchId: string, entity: AvailabilityEntity, value: boolean | null) {
    const k = entityKey(matchId, entity);
    const currentSaved = savedOverrides.has(k) ? savedOverrides.get(k)! : entity.available;
    setDrafts((prev) => {
      const next = new Map(prev);
      // Se torno al valore già salvato, rimuovo dalla draft
      if (value === null || value === currentSaved) {
        next.delete(k);
      } else {
        next.set(k, value);
      }
      return next;
    });
  }

  async function handleSave() {
    if (drafts.size === 0) return;
    setSaving(true);
    const entries = Array.from(drafts.entries());
    let okCount = 0;
    const failed: string[] = [];

    // Costruisco la lista delle richieste
    const requests = entries.map(([key, value]) => {
      const [matchId, kind, id] = key.split(":") as ["string", "user" | "child", string];
      const body: { available: boolean; childId?: string } = { available: value };
      if (kind === "child") body.childId = id;
      return { matchId, key, body };
    });

    const results = await Promise.allSettled(
      requests.map((r) =>
        fetch(`/api/matches/${r.matchId}/availability`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r.body),
        }).then(async (res) => {
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(data.error ?? "Errore");
          }
          return r.key;
        })
      )
    );

    const newDrafts = new Map(drafts);
    const newOverrides = new Map(savedOverrides);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        okCount++;
        newOverrides.set(requests[i].key, requests[i].body.available);
        newDrafts.delete(requests[i].key);
      } else {
        failed.push(r.reason instanceof Error ? r.reason.message : "Errore");
      }
    }
    setDrafts(newDrafts);
    setSavedOverrides(newOverrides);
    setSaving(false);

    if (failed.length === 0) {
      showToast({
        message: `${okCount} ${okCount === 1 ? "disponibilità salvata" : "disponibilità salvate"}`,
        severity: "success",
      });
    } else {
      showToast({
        message: `${okCount} salvate, ${failed.length} fallite — ${failed[0]}`,
        severity: failed.length === requests.length ? "error" : "warning",
      });
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 4 }, pb: drafts.size > 0 ? 12 : 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink
          component={Link}
          href="/profilo"
          underline="hover"
          color="text.secondary"
          variant="body2"
        >
          Profilo
        </MuiLink>
        <Typography variant="body2" color="text.primary">
          {t("availabilitiesTitle")}
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight={800} gutterBottom>
        {t("myAvailabilities")}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
        {t("availabilitiesDesc")}
      </Typography>

      {initialMatches.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">{t("noMatchesForTeams")}</Typography>
        </Paper>
      ) : (
        <>
          {futureMatches.length === 0 ? (
            <Paper elevation={0} variant="outlined" sx={{ p: 2.5, textAlign: "center", mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t("noUpcomingMatches")}
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                fontWeight={800}
                color="primary"
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
                  hasDraft={(e) => drafts.has(entityKey(m.matchId, e))}
                  onChange={setDraft}
                />
              ))}
            </Box>
          )}

          {pastMatches.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                fontWeight={800}
                color="text.disabled"
                sx={{ letterSpacing: "0.08em", display: "block", mb: 1 }}
              >
                {t("past")} ({pastMatches.length})
              </Typography>
              {pastMatches.map((m) => (
                <CompactMatchRow
                  key={m.matchId}
                  match={m}
                  isPast={true}
                  effectiveValue={effectiveValue}
                  hasDraft={() => false}
                  onChange={() => {}}
                />
              ))}
            </Box>
          )}
        </>
      )}

      {/* Barra salva sticky in basso */}
      {drafts.size > 0 && (
        <Paper
          elevation={6}
          sx={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            maxWidth: 560,
            mx: "auto",
            p: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            zIndex: 10,
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" fontWeight={700}>
            {t("pendingChanges", { count: drafts.size })}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            <Button
              size="small"
              onClick={() => setDrafts(new Map())}
              disabled={saving}
              sx={{ fontSize: "0.78rem" }}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={
                saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon />
              }
              onClick={handleSave}
              disabled={saving}
              sx={{ fontSize: "0.78rem" }}
            >
              {tCommon("save")}
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
}

interface CompactMatchRowProps {
  match: AvailabilityMatch;
  isPast: boolean;
  effectiveValue: (matchId: string, entity: AvailabilityEntity) => boolean | null;
  hasDraft: (entity: AvailabilityEntity) => boolean;
  onChange: (matchId: string, entity: AvailabilityEntity, value: boolean | null) => void;
}

function CompactMatchRow({
  match: m,
  isPast,
  effectiveValue,
  hasDraft,
  onChange,
}: CompactMatchRowProps) {
  const tCommon = useTranslations("common");
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1.25,
        mb: 1,
        opacity: isPast ? 0.5 : 1,
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
        <Chip
          label={MATCH_TYPE_LABEL[m.matchType]}
          size="small"
          sx={{ height: 16, fontSize: "0.6rem", fontWeight: 700 }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: "auto", fontWeight: 600, fontSize: "0.72rem" }}
        >
          {formatShortDate(m.date, tCommon)}
        </Typography>
      </Box>

      {/* Entità: una riga ciascuna */}
      {m.entities.map((entity) => {
        const value = effectiveValue(m.matchId, entity);
        const dirty = hasDraft(entity);
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
              {dirty && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    flexShrink: 0,
                  }}
                  title="Modifica non salvata"
                />
              )}
            </Box>
            <ToggleButtonGroup
              value={value}
              exclusive
              size="small"
              disabled={isPast}
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
          </Box>
        );
      })}
    </Paper>
  );
}
