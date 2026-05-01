"use client";
import { useEffect, useState } from "react";
import {
  Box, Typography, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Divider, Chip,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { ROLE_COLORS, ROLE_LABELS, ROLES } from "@/lib/constants";

interface CompetitiveTeam {
  id: string;
  name: string;
  season: string;
  color: string | null;
}

export interface RestrictionValue {
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
}

interface Props {
  value: RestrictionValue;
  onChange: (v: RestrictionValue) => void;
  disabled?: boolean;
  /** Se fornita, mostra solo le squadre di quella stagione (es. "2025-26"). */
  seasonFilter?: string;
}

/** Calcola la stagione sportiva (es. "2025-26") per una data ISO o oggetto Date. */
export function seasonForDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed; 8 = settembre
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export default function SessionRestrictionEditor({ value, onChange, disabled, seasonFilter }: Props) {
  const [allTeams, setAllTeams] = useState<CompetitiveTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingTeams(true);
    fetch("/api/competitive-teams")
      .then((r) => r.json())
      .then((data: CompetitiveTeam[]) => setAllTeams(data))
      .catch(() => {})
      .finally(() => setLoadingTeams(false));
  }, []);

  // Quando cambia la stagione, reimposta restrictTeamId se la squadra non appartiene più alla stagione
  useEffect(() => {
    if (!seasonFilter || !value.restrictTeamId || allTeams.length === 0) return;
    const team = allTeams.find((t) => t.id === value.restrictTeamId);
    if (team && team.season !== seasonFilter) {
      onChange({ ...value, restrictTeamId: null, openRoles: [] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonFilter, allTeams]);

  const teams = seasonFilter ? allTeams.filter((t) => t.season === seasonFilter) : allTeams;

  function toggleAllowedRole(role: number) {
    const next = value.allowedRoles.includes(role)
      ? value.allowedRoles.filter((r) => r !== role)
      : [...value.allowedRoles, role].sort();
    onChange({ ...value, allowedRoles: next });
  }

  function toggleOpenRole(role: number) {
    const next = value.openRoles.includes(role)
      ? value.openRoles.filter((r) => r !== role)
      : [...value.openRoles, role].sort();
    onChange({ ...value, openRoles: next });
  }

  function handleTeamChange(teamId: string) {
    onChange({ ...value, restrictTeamId: teamId || null, openRoles: [] });
  }

  const hasAnyRestriction = value.allowedRoles.length > 0 || !!value.restrictTeamId;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <LockIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          Restrizioni iscrizione
        </Typography>
        {hasAnyRestriction && (
          <Chip label="attive" size="small" color="warning" sx={{ fontSize: "0.65rem", height: 18 }} />
        )}
      </Box>

      {/* Ruoli ammessi */}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        Limita ai ruoli (vuoto = tutti ammessi)
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
        {ROLES.map((r) => {
          const selected = value.allowedRoles.includes(r);
          return (
            <Box
              key={r}
              component="button"
              type="button"
              disabled={disabled}
              onClick={() => toggleAllowedRole(r)}
              sx={{
                px: 1.5, py: 0.5,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: selected ? ROLE_COLORS[r] : "divider",
                bgcolor: selected ? ROLE_COLORS[r] : "transparent",
                color: selected ? "#fff" : "text.secondary",
                fontWeight: 600,
                fontSize: "0.75rem",
                cursor: disabled ? "default" : "pointer",
                transition: "all 0.15s",
                "&:hover:not(:disabled)": { borderColor: ROLE_COLORS[r], color: selected ? "#fff" : ROLE_COLORS[r] },
              }}
            >
              {ROLE_LABELS[r]}
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Restrizione squadra */}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        Limita alla squadra (opzionale)
        {seasonFilter && teams.length === 0 && !loadingTeams && (
          <Box component="span" sx={{ ml: 1, color: "warning.main" }}>— nessuna squadra per {seasonFilter}</Box>
        )}
      </Typography>
      {loadingTeams ? (
        <CircularProgress size={18} sx={{ mb: 2 }} />
      ) : (
        <FormControl fullWidth size="small" sx={{ mb: value.restrictTeamId ? 2 : 0 }} disabled={disabled || teams.length === 0}>
          <InputLabel shrink>Squadra</InputLabel>
          <Select
            value={value.restrictTeamId ?? ""}
            onChange={(e) => handleTeamChange(e.target.value as string)}
            label="Squadra"
            notched
            displayEmpty
          >
            <MenuItem value=""><em>Nessuna restrizione</em></MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {t.color && (
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: t.color, flexShrink: 0 }} />
                  )}
                  {t.name}
                  {!seasonFilter && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      ({t.season})
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Ruoli aperti (solo se c'è restrizione squadra) */}
      {value.restrictTeamId && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
            Ruoli aperti a tutte le squadre (esenti dalla restrizione)
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {ROLES.map((r) => {
              const selected = value.openRoles.includes(r);
              return (
                <Box
                  key={r}
                  component="button"
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleOpenRole(r)}
                  sx={{
                    px: 1.5, py: 0.5,
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: selected ? ROLE_COLORS[r] : "divider",
                    bgcolor: selected ? ROLE_COLORS[r] : "transparent",
                    color: selected ? "#fff" : "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    cursor: disabled ? "default" : "pointer",
                    transition: "all 0.15s",
                    "&:hover:not(:disabled)": { borderColor: ROLE_COLORS[r], color: selected ? "#fff" : ROLE_COLORS[r] },
                  }}
                >
                  {ROLE_LABELS[r]}
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
