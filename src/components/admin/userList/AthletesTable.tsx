"use client";
import {
  Box,
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
import { GENDER_LABELS_SHORT } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import {
  PersonCardButton,
  PersonNameButton,
  PersonRowMenu,
} from "@/components/admin/userList/PersonRowControls";
import TeamAvatar from "@/components/teams/TeamAvatar";
import TeamChip from "@/components/teams/TeamChip";
import {
  AppRoleChip,
  AthleteStatusChip,
  SuggestedRoleChip,
  TeamCellSelect,
  type AdminRow,
  type TeamInfo,
  type UserEntry,
} from "@/components/admin/userList/userListShared";
import { childOfLabel, joinNames } from "@/lib/guardianNames";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export type AthleteSortColumn = "name" | "sportRole" | "registrations";

interface AthletesTableProps {
  rows: AdminRow[];
  sortBy: AthleteSortColumn;
  sortDir: "asc" | "desc";
  onSort: (col: AthleteSortColumn) => void;
  teams: TeamInfo[];
  currentSeason: string;
  /** Squadra ed eliminazione di un account sono dell'admin. */
  isAdmin: boolean;
  /** Testo della tabella vuota (dipende dai filtri accesi). */
  emptyLabel: string;
  onConfirmSuggestedRole: (row: UserEntry & { kind: "user" }) => void;
  onRejectSuggestedRole: (row: UserEntry & { kind: "user" }) => void;
  onTeamChange: (row: AdminRow, teamId: string) => void;
  onEdit: (row: AdminRow) => void;
  onDelete: (row: AdminRow) => void;
}

const rowKey = (row: AdminRow) => `${row.kind}-${row.id}`;
const rowName = (row: AdminRow) => row.name ?? (row.kind === "user" ? row.email : "—");
const currentTeam = (row: AdminRow, season: string) =>
  row.teamMemberships.find((m) => m.team.season === season);

/** "Figlio di … · senza account", "Figlia di …", "Genitore di …", o niente. */
function familyLine(row: AdminRow): string | null {
  if (row.kind === "child") {
    const parents = row.guardians.map((g) => g.name?.trim() || g.email);
    return `${parents.length > 0 ? `${childOfLabel(row.gender, parents)} · ` : ""}senza account`;
  }
  const parts = [
    row.parentNames?.length ? childOfLabel(row.gender, row.parentNames) : null,
    row.childNames?.length ? `Genitore di ${joinNames(row.childNames)}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Chi e' la persona, sotto il nome: l'email di chi ha un account, il genitore
 * di chi non ce l'ha. E' l'unica differenza fra i due tipi di riga che allo
 * staff serve vedere qui.
 */
function AthleteIdentity({
  row,
  season,
  size,
  onOpen,
}: {
  row: AdminRow;
  season: string;
  size: number;
  /** In tabella il nome apre la scheda; nella card lo fa tutta la card. */
  onOpen?: () => void;
}) {
  const team = currentTeam(row, season)?.team;
  const family = familyLine(row);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
      <TeamAvatar
        name={rowName(row)}
        image={row.kind === "user" ? row.image : null}
        color={team?.color}
        size={size}
        sx={{ fontSize: TYPE_SCALE.sm }}
      />
      <Box sx={{ minWidth: 0 }}>
        {onOpen ? (
          <PersonNameButton name={rowName(row)} onOpen={onOpen} />
        ) : (
          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
            {rowName(row)}
          </Typography>
        )}
        {row.kind === "user" && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: "block" }}
            title={row.email}
          >
            {row.email}
          </Typography>
        )}
        {/* I legami di famiglia in corsivo, come nella tab Account: "Figlio di"
            per chi ha dei genitori collegati (con o senza account), "Genitore
            di" per il genitore che gioca. */}
        {family && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            title={family}
            sx={{ display: "block", fontStyle: "italic" }}
          >
            {family}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", "&:not(:empty)": { mt: 0.25 } }}>
          {/* Il ruolo utente solo quando non e' "Atleta": il genitore o
              l'allenatore che gioca. */}
          {row.kind === "user" && row.appRole !== "ATHLETE" && (
            <AppRoleChip role={row.appRole} sx={{ height: 20, fontSize: TYPE_SCALE.xs }} />
          )}
          <AthleteStatusChip status={row.athleteStatus} />
        </Box>
      </Box>
    </Box>
  );
}

function RowActions({
  row,
  isAdmin,
  onEdit,
  onDelete,
}: Pick<AthletesTableProps, "isAdmin" | "onEdit" | "onDelete"> & { row: AdminRow }) {
  return (
    <PersonRowMenu
      name={rowName(row)}
      // Un account lo elimina solo l'admin; un figlio senza account anche l'allenatore.
      canDelete={isAdmin || row.kind === "child"}
      onOpen={() => onEdit(row)}
      onDelete={() => onDelete(row)}
    />
  );
}

/** Tabella (desktop) e card (mobile) della tab Atleti: utenti e figli insieme. */
export default function AthletesTable({
  rows,
  sortBy,
  sortDir,
  onSort,
  teams,
  currentSeason,
  isAdmin,
  emptyLabel,
  onConfirmSuggestedRole,
  onRejectSuggestedRole,
  onTeamChange,
  onEdit,
  onDelete,
}: AthletesTableProps) {
  const sortLabel = (col: AthleteSortColumn, label: string) => (
    <TableSortLabel
      active={sortBy === col}
      direction={sortBy === col ? sortDir : "asc"}
      onClick={() => onSort(col)}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <>
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
        <Table size="small" aria-label="Lista atleti">
          <TableHead>
            <TableRow>
              <TableCell>{sortLabel("name", "Atleta")}</TableCell>
              <TableCell align="center">{sortLabel("sportRole", "Baskin")}</TableCell>
              <TableCell align="center">Squadra</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" } }}>
                Genere
              </TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                {sortLabel("registrations", "Allenamenti")}
              </TableCell>
              <TableCell align="center">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)} hover>
                <TableCell sx={{ maxWidth: 300 }}>
                  <AthleteIdentity
                    row={row}
                    season={currentSeason}
                    size={30}
                    onOpen={() => onEdit(row)}
                  />
                </TableCell>

                {/* Ruolo Baskin: confermato, oppure suggerito dall'atleta e da confermare. */}
                <TableCell align="center">
                  {row.sportRole ? (
                    <RoleBadge role={row.sportRole} variant={row.sportRoleVariant} />
                  ) : row.kind === "user" && row.sportRoleSuggested ? (
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
                          aria-label={`Conferma ruolo di ${rowName(row)}`}
                          sx={{ color: "success.main" }}
                          onClick={() => onConfirmSuggestedRole(row)}
                        >
                          <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rifiuta suggerimento">
                        <IconButton
                          size="small"
                          aria-label={`Rifiuta ruolo suggerito per ${rowName(row)}`}
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

                <TableCell align="center">
                  <TeamCellSelect
                    value={currentTeam(row, currentSeason)?.teamId ?? ""}
                    teams={teams}
                    memberships={row.teamMemberships}
                    onChange={(teamId) => onTeamChange(row, teamId)}
                    ariaLabel={`Squadra di ${rowName(row)}`}
                    readOnly={!isAdmin}
                  />
                </TableCell>

                <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <Typography variant="body2" color={row.gender ? undefined : "text.secondary"}>
                    {row.gender ? GENDER_LABELS_SHORT[row.gender] : "—"}
                  </Typography>
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    display: { xs: "none", md: "table-cell" },
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row._count.registrations}
                </TableCell>

                <TableCell align="center">
                  <RowActions row={row} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Card per il telefono: la squadra si legge, si cambia dalla scheda. */}
      <Box
        sx={{
          display: { xs: "block", sm: "none" },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: RADIUS.lg,
        }}
      >
        {rows.map((row) => {
          const team = currentTeam(row, currentSeason)?.team;
          return (
            <Box
              key={rowKey(row)}
              sx={{
                pl: 2,
                pr: 1,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <PersonCardButton name={rowName(row)} onOpen={() => onEdit(row)}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <AthleteIdentity row={row} season={currentSeason} size={36} />
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.75, pl: 6 }}>
                    {row.sportRole ? (
                      <RoleBadge role={row.sportRole} variant={row.sportRoleVariant} />
                    ) : (
                      row.kind === "user" &&
                      row.sportRoleSuggested && (
                        <SuggestedRoleChip
                          role={row.sportRoleSuggested}
                          variant={row.sportRoleSuggestedVariant}
                        />
                      )
                    )}
                    {team && <TeamChip name={team.name} color={team.color} compact />}
                  </Box>
                </Box>
              </PersonCardButton>
              <RowActions row={row} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
            </Box>
          );
        })}
        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {emptyLabel}
          </Typography>
        )}
      </Box>
    </>
  );
}
