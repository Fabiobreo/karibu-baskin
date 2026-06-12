"use client";
import { Avatar, Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import RatingBadge from "@/components/rating/RatingBadge";
import { AthleteStatusChip, type AdminRow } from "@/components/admin/userList/userListShared";

interface UsersMobileCardsProps {
  rows: AdminRow[];
  currentSeason: string;
  activeFilterCount: number;
  onEdit: (row: AdminRow) => void;
  onDelete: (row: AdminRow) => void;
}

/** Vista a card del tab Utenti per viewport mobile. */
export default function UsersMobileCards({
  rows,
  currentSeason,
  activeFilterCount,
  onEdit,
  onDelete,
}: UsersMobileCardsProps) {
  return (
    <Box
      sx={{
        display: { xs: "block", sm: "none" },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      {rows.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {activeFilterCount > 0
              ? "Nessun risultato corrisponde ai filtri selezionati."
              : "Nessun utente trovato."}
          </Typography>
        </Box>
      ) : (
        rows.map((row) => {
          if (row.kind !== "user") return null;
          const team = row.teamMemberships.find((m) => m.team.season === currentSeason)?.team;
          return (
            <Box
              key={`user-${row.id}`}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Avatar
                src={row.image ?? undefined}
                sx={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}
              >
                {(row.name ?? "?")[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {row.name ?? "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {row.email}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                  <Chip
                    label={ROLE_LABELS_IT[row.appRole]}
                    size="small"
                    color={ROLE_CHIP_COLORS[row.appRole]}
                    sx={{ fontWeight: 600, fontSize: "0.68rem" }}
                  />
                  <AthleteStatusChip status={row.athleteStatus} />
                  {row.sportRole ? (
                    <Chip
                      label={sportRoleLabel(row.sportRole, row.sportRoleVariant)}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[row.sportRole],
                        color: "common.white",
                        fontWeight: 700,
                        fontSize: "0.68rem",
                      }}
                    />
                  ) : row.sportRoleSuggested ? (
                    <Chip
                      label={`${sportRoleLabel(row.sportRoleSuggested, row.sportRoleSuggestedVariant)} ?`}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: ROLE_COLORS[row.sportRoleSuggested],
                        color: ROLE_COLORS[row.sportRoleSuggested],
                        fontWeight: 700,
                        fontSize: "0.68rem",
                      }}
                    />
                  ) : null}
                  {team && (
                    <Chip
                      label={team.name}
                      size="small"
                      sx={{
                        bgcolor: team.color ?? "primary.main",
                        color: contrastText(team.color),
                        fontWeight: 600,
                        fontSize: "0.68rem",
                      }}
                    />
                  )}
                  {row.ratingMu != null && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={<RatingBadge mu={row.ratingMu} sigma={row.ratingSigma} compact />}
                      sx={{ fontSize: "0.68rem" }}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
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
            </Box>
          );
        })
      )}
    </Box>
  );
}
