"use client";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import { it } from "date-fns/locale";
import { GENDER_LABELS_SHORT } from "@/lib/constants";
import { formatRome } from "@/lib/dateUtils";
import RoleBadge from "@/components/common/RoleBadge";
import { PersonNameButton, PersonRowMenu } from "@/components/admin/userList/PersonRowControls";
import {
  AppRoleChip,
  AthleteStatusChip,
  SuggestedRoleChip,
  TeamCellSelect,
  type AdminRow,
  type SortColumn,
  type TeamInfo,
  type UserEntry,
} from "@/components/admin/userList/userListShared";
import { TYPE_SCALE } from "@/lib/typeScale";
import { childOfLabel, joinNames } from "@/lib/guardianNames";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface UsersTableProps {
  rows: AdminRow[];
  sortBy: SortColumn;
  sortDir: "asc" | "desc";
  onSort: (col: SortColumn) => void;
  teams: TeamInfo[];
  currentSeason: string;
  activeFilterCount: number;
  /** Squadra ed eliminazione sono dell'admin. */
  isAdmin: boolean;
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
  isAdmin,
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
        borderRadius: RADIUS.lg,
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
            <TableCell align="center">
              <TableSortLabel
                active={sortBy === "team"}
                direction={sortBy === "team" ? sortDir : "asc"}
                onClick={() => onSort("team")}
              >
                Squadra
              </TableSortLabel>
            </TableCell>
            <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" }, px: 1 }}>
              <TableSortLabel
                active={sortBy === "gender"}
                direction={sortBy === "gender" ? sortDir : "asc"}
                onClick={() => onSort("gender")}
              >
                Genere
              </TableSortLabel>
            </TableCell>
            {/* Solo da `lg`: sotto, otto colonne non stanno nel pannello. */}
            <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" }, px: 1 }}>
              <TableSortLabel
                active={sortBy === "registrations"}
                direction={sortBy === "registrations" ? sortDir : "desc"}
                onClick={() => onSort("registrations")}
              >
                Allenamenti
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ display: { xs: "none", lg: "table-cell" }, px: 1 }}>
              <TableSortLabel
                active={sortBy === "createdAt"}
                direction={sortBy === "createdAt" ? sortDir : "desc"}
                onClick={() => onSort("createdAt")}
              >
                Iscritto il
              </TableSortLabel>
            </TableCell>
            <TableCell align="center" sx={{ px: 1 }}>
              Azioni
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            if (row.kind !== "user") return null;
            return (
              <TableRow key={`user-${row.id}`} hover>
                {/* Nome + email. L'email sta sotto il nome e non in una colonna
                    sua: con otto colonne la tabella superava la larghezza del
                    pannello e le azioni finivano fuori vista. Una riga sola,
                    troncata, col valore intero in hover. */}
                <TableCell sx={{ maxWidth: 280 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={row.image ?? undefined}
                      sx={{ width: 30, height: 30, fontSize: TYPE_SCALE.sm }}
                    >
                      {(row.name ?? "?")[0].toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <PersonNameButton name={row.name ?? row.email} onOpen={() => onEdit(row)} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        title={row.email ?? undefined}
                        sx={{ display: "block" }}
                      >
                        {row.email}
                      </Typography>
                      {row.childNames && row.childNames.length > 0 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          title={`Genitore di ${joinNames(row.childNames)}`}
                          sx={{ display: "block", fontStyle: "italic" }}
                        >
                          Genitore di {joinNames(row.childNames)}
                        </Typography>
                      )}
                      {row.parentNames && row.parentNames.length > 0 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          title={childOfLabel(row.gender, row.parentNames)}
                          sx={{ display: "block", fontStyle: "italic" }}
                        >
                          {childOfLabel(row.gender, row.parentNames)}
                        </Typography>
                      )}
                      <AthleteStatusChip status={row.athleteStatus} />
                    </Box>
                  </Box>
                </TableCell>

                {/* Ruolo utente: si legge qui, si cambia nella scheda (con Salva e
                    Annulla). Prima era una tendina attiva su ogni riga. */}
                <TableCell>
                  <AppRoleChip role={row.appRole} />
                </TableCell>

                {/* Ruolo Baskin */}
                <TableCell align="center">
                  {row.sportRole ? (
                    <RoleBadge role={row.sportRole} variant={row.sportRoleVariant} />
                  ) : row.sportRoleSuggested ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        justifyContent: "center",
                      }}
                    >
                      <SuggestedRoleChip
                        role={row.sportRoleSuggested}
                        variant={row.sportRoleSuggestedVariant}
                      />
                      <Tooltip title="Conferma ruolo">
                        <IconButton
                          size="small"
                          aria-label={`Conferma ruolo di ${row.name ?? row.email}`}
                          sx={{ color: "success.main" }}
                          onClick={() => onConfirmSuggestedRole(row)}
                        >
                          <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rifiuta suggerimento">
                        <IconButton
                          size="small"
                          aria-label={`Rifiuta ruolo suggerito per ${row.name ?? row.email}`}
                          sx={{ color: "error.main" }}
                          onClick={() => onRejectSuggestedRole(row)}
                        >
                          <HighlightOffIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
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
                    ariaLabel={`Squadra di ${row.name ?? row.email}`}
                    readOnly={!isAdmin}
                  />
                </TableCell>

                {/* Genere */}
                <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" }, px: 1 }}>
                  {row.gender ? (
                    <Typography variant="body2">{GENDER_LABELS_SHORT[row.gender]}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* Allenamenti a cui si è iscritto */}
                <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" }, px: 1 }}>
                  <Typography
                    variant="body2"
                    color={row._count.registrations > 0 ? "text.primary" : "text.secondary"}
                  >
                    {row._count.registrations}
                  </Typography>
                </TableCell>

                {/* Data di iscrizione */}
                <TableCell
                  sx={{ display: { xs: "none", lg: "table-cell" }, px: 1, whiteSpace: "nowrap" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {formatRome(row.createdAt, "d MMM yyyy", { locale: it })}
                  </Typography>
                </TableCell>

                {/* Azioni */}
                <TableCell align="center" sx={{ px: 1 }}>
                  <PersonRowMenu
                    name={row.name ?? row.email}
                    canDelete={isAdmin}
                    onOpen={() => onEdit(row)}
                    onDelete={() => onDelete(row)}
                  />
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
