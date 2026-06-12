"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Container,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { useToast } from "@/context/ToastContext";

export interface MatchAvailabilityEntity {
  kind: "user" | "child";
  id: string;
  name: string;
  teamName: string;
  teamColor: string | null;
  available: boolean | null;
}

interface Props {
  matchId: string;
  entities: MatchAvailabilityEntity[];
}

function entityKey(e: MatchAvailabilityEntity) {
  return `${e.kind}:${e.id}`;
}

/**
 * Card self-service in pagina partita: l'atleta (o il genitore per i figli)
 * dichiara la propria disponibilità senza passare dal profilo. Mostrata solo
 * per partite future a chi è membro di una delle squadre della partita.
 */
export default function MatchAvailabilityCard({ matchId, entities }: Props) {
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const t = useTranslations("matches");
  const tCommon = useTranslations("common");

  function effectiveValue(e: MatchAvailabilityEntity): boolean | null {
    const k = entityKey(e);
    if (overrides.has(k)) return overrides.get(k)!;
    return e.available;
  }

  async function handleChange(e: MatchAvailabilityEntity, value: boolean) {
    const k = entityKey(e);
    if (savingKeys.has(k)) return;
    const prev = overrides.has(k) ? overrides.get(k)! : e.available;
    if (value === prev) return;

    setOverrides((m) => new Map(m).set(k, value));
    setSavingKeys((s) => new Set(s).add(k));
    try {
      const body: { available: boolean; childId?: string } = { available: value };
      if (e.kind === "child") body.childId = e.id;
      const res = await fetch(`/api/matches/${matchId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? tCommon("error"));
      }
      showToast({ message: t("availabilitySaved"), severity: "success" });
    } catch (err) {
      // rollback
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
    <Container maxWidth="md" sx={{ mt: { xs: 3, md: 4 }, mb: -1 }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{ p: { xs: 2, md: 2.5 }, borderColor: "primary.main", borderRadius: 2 }}
      >
        <Typography
          variant="overline"
          fontWeight={800}
          color="primary"
          sx={{ letterSpacing: "0.1em", display: "block", mb: 1.5 }}
        >
          {t("yourAvailability")}
        </Typography>

        {entities.map((e) => {
          const value = effectiveValue(e);
          const saving = savingKeys.has(entityKey(e));
          return (
            <Box
              key={entityKey(e)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                py: 0.75,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                {entities.length > 1 && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: e.teamColor ?? "primary.main",
                      flexShrink: 0,
                    }}
                  />
                )}
                <Typography variant="body1" fontWeight={600} noWrap title={e.name}>
                  {entities.length > 1 ? e.name : e.teamName}
                </Typography>
                {saving && <CircularProgress size={14} sx={{ flexShrink: 0 }} />}
              </Box>
              <ToggleButtonGroup
                value={value}
                exclusive
                size="small"
                disabled={saving}
                onChange={(_, v) => {
                  if (v === null) return;
                  handleChange(e, v as boolean);
                }}
                sx={{
                  "& .MuiToggleButton-root": {
                    py: 0.4,
                    px: 1.5,
                    fontWeight: 700,
                    textTransform: "none",
                  },
                }}
              >
                <ToggleButton
                  value={true}
                  sx={{ "&.Mui-selected": { bgcolor: "match.win", color: "common.white" } }}
                >
                  <EventAvailableIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {tCommon("yes")}
                </ToggleButton>
                <ToggleButton
                  value={false}
                  sx={{ "&.Mui-selected": { bgcolor: "match.loss", color: "common.white" } }}
                >
                  <EventBusyIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {tCommon("no")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          );
        })}
      </Paper>
    </Container>
  );
}
