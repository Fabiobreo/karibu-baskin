"use client";
import { Box, Chip, MenuItem, Select, Typography } from "@mui/material";
import type { AppRole, AthleteStatus, Gender } from "@prisma/client";
import { ATHLETE_STATUS_CHIP_COLORS, ATHLETE_STATUS_LABELS } from "@/lib/constants";

// ── Tipi condivisi della gestione utenti ─────────────────────────────────────

export const ALL_APP_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];

export type SortColumn = "name" | "createdAt" | "sportRole" | "registrations" | "appRole";

export interface RoleHistoryEntry {
  sportRole: number;
  changedAt: Date | string;
}

export interface TeamInfo {
  id: string;
  name: string;
  season: string;
  color: string | null;
}

export interface MembershipInfo {
  id: string;
  teamId: string;
  isCaptain: boolean;
  team: TeamInfo;
}

export interface UserEntry {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  appRole: AppRole;
  sportRole: number | null;
  sportRoleVariant: string | null;
  sportRoleSuggested: number | null;
  sportRoleSuggestedVariant: string | null;
  gender: Gender | null;
  birthDate: Date | string | null;
  athleteStatus: AthleteStatus | null;
  ratingMu: number | null;
  ratingSigma: number | null;
  createdAt: Date | string;
  _count: { registrations: number };
  sportRoleHistory: RoleHistoryEntry[];
  teamMemberships: MembershipInfo[];
}

export interface ChildEntry {
  id: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: Gender | null;
  birthDate: Date | string | null;
  athleteStatus: AthleteStatus | null;
  ratingMu: number | null;
  ratingSigma: number | null;
  createdAt: Date | string;
  parent: { name: string | null; email: string };
  _count: { registrations: number };
  teamMemberships: MembershipInfo[];
}

export type AdminRow = (UserEntry & { kind: "user" }) | (ChildEntry & { kind: "child" });

export interface CurrentFilters {
  search?: string;
  appRole?: string;
  sportRole?: string;
  gender?: string;
  teamId?: string;
  athleteStatus?: string;
  sortBy?: string;
  sortDir?: string;
  limit?: number;
}

// ── Componenti condivisi ─────────────────────────────────────────────────────

/** Chip per lo stato atleta. Non renderizza nulla se attivo (status null). */
export function AthleteStatusChip({ status }: { status: AthleteStatus | null }) {
  if (!status) return null;
  return (
    <Chip
      label={ATHLETE_STATUS_LABELS[status]}
      size="small"
      color={ATHLETE_STATUS_CHIP_COLORS[status]}
      variant="outlined"
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700 }}
    />
  );
}

/**
 * Select della squadra (stagione corrente) usata nelle celle delle tabelle
 * utenti e figli: pallino colore + nome, voce "Nessuna squadra".
 */
export function TeamCellSelect({
  value,
  teams,
  memberships,
  onChange,
}: {
  value: string;
  teams: TeamInfo[];
  memberships: MembershipInfo[];
  onChange: (teamId: string) => void;
}) {
  return (
    <Select
      value={value}
      size="small"
      displayEmpty
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 110, fontSize: "0.8rem" }}
      renderValue={(val) => {
        if (!val)
          return (
            <Typography variant="body2" color="text.disabled" component="span">
              —
            </Typography>
          );
        const team =
          teams.find((t) => t.id === val) ?? memberships.find((m) => m.teamId === val)?.team;
        if (!team)
          return (
            <Typography variant="body2" component="span">
              —
            </Typography>
          );
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {team.color && (
              <Box
                component="span"
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: team.color,
                  flexShrink: 0,
                }}
              />
            )}
            <Typography variant="body2" noWrap component="span">
              {team.name}
            </Typography>
          </Box>
        );
      }}
    >
      <MenuItem value="">
        <em>Nessuna squadra</em>
      </MenuItem>
      {teams.map((t) => (
        <MenuItem key={t.id} value={t.id}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {t.color && (
              <Box
                component="span"
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: t.color,
                  flexShrink: 0,
                }}
              />
            )}
            {t.name}
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}
