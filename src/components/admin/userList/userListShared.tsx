"use client";
import {
  ROLE_CHIP_ICONS,
  ATHLETE_STATUS_CHIP_ICONS,
  appRoleChipSx,
  appRoleChipVariant,
} from "@/components/common/appRoleIcons";
import { Box, Chip, MenuItem, Select, Typography } from "@mui/material";
import type { AppRole, AthleteStatus, Gender } from "@prisma/client";
import type { SxProps, Theme } from "@mui/material/styles";
import { ATHLETE_STATUS_LABELS, ROLE_LABELS_IT, sportRoleLabel } from "@/lib/constants";
import { TYPE_SCALE } from "@/lib/typeScale";
import { teamColor } from "@/lib/teamColors";
import TeamChip from "@/components/teams/TeamChip";

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
  /** Figli di cui e' genitore, nell'ordine di collegamento. */
  childNames?: string[];
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
  /** Genitori collegati, nell'ordine di collegamento. */
  guardians: { id: string; name: string | null; email: string }[];
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
  const Icon = ATHLETE_STATUS_CHIP_ICONS[status];
  return (
    <Chip
      label={ATHLETE_STATUS_LABELS[status]}
      size="small"
      variant="outlined"
      icon={<Icon />}
      sx={{
        height: 20,
        fontSize: TYPE_SCALE.xs,
        "& .MuiChip-icon": { fontSize: TYPE_SCALE.sm, color: "text.secondary" },
      }}
    />
  );
}

/**
 * Chip del ruolo utente: icona, parola e la tinta del ruolo (`appRoleChipSx`:
 * tonale per atleta, genitore e allenatore, nero pieno per l'admin, neutro per
 * l'ospite).
 */
export function AppRoleChip({ role, sx }: { role: AppRole; sx?: SxProps<Theme> }) {
  const Icon = ROLE_CHIP_ICONS[role];
  return (
    <Chip
      label={ROLE_LABELS_IT[role]}
      size="small"
      variant={appRoleChipVariant(role)}
      icon={<Icon />}
      sx={[appRoleChipSx(role), ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}

/**
 * Ruolo Baskin suggerito dall'atleta, in attesa di conferma dello staff:
 * bordo tratteggiato e testo secondario, per non confonderlo col ruolo
 * confermato (`RoleBadge`, pieno).
 */
export function SuggestedRoleChip({ role, variant }: { role: number; variant?: string | null }) {
  return (
    <Chip
      label={`${sportRoleLabel(role, variant)} ?`}
      size="small"
      variant="outlined"
      title="Autovalutazione da confermare"
      sx={{
        borderStyle: "dashed",
        borderColor: "text.secondary",
        color: "text.secondary",
        fontSize: TYPE_SCALE.xs,
      }}
    />
  );
}

/**
 * Select della squadra (stagione corrente) usata nelle celle delle tabelle
 * utenti e figli: chip pieno nella tinta della squadra, voce "Nessuna squadra".
 */
export function TeamCellSelect({
  value,
  teams,
  memberships,
  onChange,
  ariaLabel,
}: {
  value: string;
  teams: TeamInfo[];
  memberships: MembershipInfo[];
  onChange: (teamId: string) => void;
  /** Nome accessibile: nella riga di una tabella la select non ha etichetta visibile. */
  ariaLabel: string;
}) {
  return (
    <Select
      value={value}
      size="small"
      displayEmpty
      inputProps={{ "aria-label": ariaLabel }}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 110, fontSize: TYPE_SCALE.xs }}
      renderValue={(val) => {
        if (!val)
          return (
            <Typography variant="body2" color="text.secondary" component="span">
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
        return <TeamChip name={team.name} color={team.color} sx={{ cursor: "pointer" }} />;
      }}
    >
      <MenuItem value="">
        <em>Nessuna squadra</em>
      </MenuItem>
      {teams.map((t) => (
        <MenuItem key={t.id} value={t.id}>
          <TeamChip name={t.name} color={t.color} sx={{ cursor: "pointer" }} />
        </MenuItem>
      ))}
    </Select>
  );
}
