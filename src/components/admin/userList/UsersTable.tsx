"use client";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";
import { ROLE_COLORS, sportRoleLabel, GENDER_LABELS_SHORT } from "@/lib/constants";
import RatingBadge from "@/components/rating/RatingBadge";
import {
  ALL_APP_ROLES,
  AthleteStatusChip,
  TeamCellSelect,
  type AdminRow,
  type SortColumn,
  type TeamInfo,
  type UserEntry,
} from "@/components/admin/userList/userListShared";

interface UsersTableProps {
  rows: AdminRow[];
  sortBy: SortColumn;
  sortDir: "asc" | "desc";
  onSort: (col: SortColumn) => void;
  teams: TeamInfo[];
  currentSeason: string;
  activeFilterCount: number;
  onRoleChange: (userId: string, role: AppRole) => void;
  onConfirmSuggestedRole: (row: UserEntry & { kind: "user" }) => void;
  onRejectSuggestedRole: (row: UserEntry & { kind: "user" }) => void;
  onTeamChange: (row: AdminRow, teamId: string) => void;
  onEdit: (row: AdminRow) => void;
  onDelete: (row: AdminRow) => void;
}

/** Tabella desktop del tab Utenti. */
export default function UsersTable({
  rows,
  sortBy,
  sortDir,
  onSort,
  teams,
  currentSeason,
  activeFilterCount,
  onRoleChange,
  onConfirmSuggestedRole,
  onRejectSuggestedRole,
  onTeamChange,
  onEdit,
  onDelete,
}: UsersTableProps) {
  return (
    <TableContainer
      component={Box}
      sx={{
        display: { xs: "none", sm: "block" },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflowX: "auto",
      }}
    >
      <Table size="small" aria-label="Lista utenti">
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortBy === "name"}
                direction={sortBy === "name" ? sortDir : "asc"}
                onClick={() => onSort("name")}
              >
                Utente
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Email</TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === "appRole"}
                direction={sortBy === "appRole" ? sortDir : "asc"}
                onClick={() => onSort("appRole")}
              >
                Ruolo
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">
              <TableSortLabel
                active={sortBy === "sportRole"}
                direction={sortBy === "sportRole" ? sortDir : "asc"}
                onClick={() => onSort("sportRole")}
              >
                Baskin
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">Squadra</TableCell>
            <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
              Skill
            </TableCell>
            <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
              Genere
            </TableCell>
            <TableCell align="center">Azioni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            if (row.kind !== "user") return null;
            return (
              <TableRow key={`user-${row.id}`} hover>
                {/* Nome */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={row.image ?? undefined}
                      sx={{ width: 30, height: 30, fontSize: 13 }}
                    >
                      {(row.name ?? "?")[0].toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {row.name ?? "—"}
                      </Typography>
                      <AthleteStatusChip status={row.athleteStatus} />
                    </Box>
                  </Box>
                </TableCell>

                {/* Email */}
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {row.email}
                  </Typography>
                </TableCell>

                {/* Ruolo utente */}
                <TableCell>
                  <Select
                    value={row.appRole}
                    size="small"
                    onChange={(e) => onRoleChange(row.id, e.target.value as AppRole)}
                    sx={{ minWidth: 110, fontSize: "0.8rem" }}
                    renderValue={(val) => (
                      <Chip
                        label={ROLE_LABELS_IT[val as AppRole]}
                        size="small"
                        color={ROLE_CHIP_COLORS[val as AppRole]}
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  >
                    {ALL_APP_ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        <Chip
                          label={ROLE_LABELS_IT[r]}
                          size="small"
                          color={ROLE_CHIP_COLORS[r]}
                          sx={{ fontWeight: 600 }}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>

                {/* Ruolo Baskin */}
                <TableCell align="center">
                  {row.sportRole ? (
                    <Chip
                      label={sportRoleLabel(row.sportRole, row.sportRoleVariant)}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[row.sportRole],
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                      }}
                    />
                  ) : row.sportRoleSuggested ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        justifyContent: "center",
                      }}
                    >
                      <Chip
                        label={`${sportRoleLabel(row.sportRoleSuggested, row.sportRoleSuggestedVariant)} ?`}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: ROLE_COLORS[row.sportRoleSuggested],
                          color: ROLE_COLORS[row.sportRoleSuggested],
                          fontWeight: 700,
                          fontSize: "0.72rem",
                        }}
                        title="Autovalutazione — da confermare"
                      />
                      <Tooltip title="Conferma ruolo">
                        <IconButton
                          size="small"
                          sx={{ p: "2px", color: "success.main" }}
                          onClick={() => onConfirmSuggestedRole(row)}
                        >
                          <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rifiuta suggerimento">
                        <IconButton
                          size="small"
                          sx={{ p: "2px", color: "error.main" }}
                          onClick={() => onRejectSuggestedRole(row)}
                        >
                          <HighlightOffIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* Squadra */}
                <TableCell align="center">
                  <TeamCellSelect
                    value={
                      row.teamMemberships.find((m) => m.team.season === currentSeason)?.teamId ?? ""
                    }
                    teams={teams}
                    memberships={row.teamMemberships}
                    onChange={(teamId) => onTeamChange(row, teamId)}
                  />
                </TableCell>

                {/* Skill (TrueSkill) — solo COACH/ADMIN */}
                <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <RatingBadge mu={row.ratingMu} sigma={row.ratingSigma} />
                </TableCell>

                {/* Genere */}
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {row.gender ? (
                    <Typography variant="body2">{GENDER_LABELS_SHORT[row.gender]}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* Azioni */}
                <TableCell align="center">
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                    <Tooltip title="Modifica utente">
                      <IconButton
                        size="medium"
                        aria-label="Modifica utente"
                        onClick={() => onEdit(row)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina utente">
                      <IconButton
                        size="medium"
                        aria-label="Elimina utente"
                        color="error"
                        onClick={() => onDelete(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {activeFilterCount > 0
                  ? "Nessun risultato corrisponde ai filtri selezionati."
                  : "Nessun utente trovato."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
