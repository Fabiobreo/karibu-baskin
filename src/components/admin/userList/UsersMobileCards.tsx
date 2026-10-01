"use client";
import TeamChip from "@/components/teams/TeamChip";
import { Avatar, Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RoleBadge from "@/components/common/RoleBadge";
import RatingBadge from "@/components/rating/RatingBadge";
import {
  AppRoleChip,
  AthleteStatusChip,
  SuggestedRoleChip,
  type AdminRow,
} from "@/components/admin/userList/userListShared";
import { TYPE_SCALE } from "@/lib/typeScale";
import { childOfLabel, joinNames } from "@/lib/guardianNames";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
        borderRadius: RADIUS.lg,
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
                sx={{ width: 36, height: 36, fontSize: TYPE_SCALE.sm, flexShrink: 0 }}
              >
                {(row.name ?? "?")[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
                  {row.name ?? "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {row.email}
                </Typography>
                {row.childNames && row.childNames.length > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ fontStyle: "italic" }}
                  >
                    Genitore di {joinNames(row.childNames)}
                  </Typography>
                )}
                {row.parentNames && row.parentNames.length > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    display="block"
                    sx={{ fontStyle: "italic" }}
                  >
                    {childOfLabel(row.gender, row.parentNames)}
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                  <AppRoleChip role={row.appRole} sx={{ fontSize: TYPE_SCALE.xs }} />
                  <AthleteStatusChip status={row.athleteStatus} />
                  {row.sportRole ? (
                    <RoleBadge role={row.sportRole} variant={row.sportRoleVariant} />
                  ) : row.sportRoleSuggested ? (
                    <SuggestedRoleChip
                      role={row.sportRoleSuggested}
                      variant={row.sportRoleSuggestedVariant}
                    />
                  ) : null}
                  {team && (
                    <TeamChip
                      name={team.name}
                      color={team.color}
                      sx={{ fontSize: TYPE_SCALE.xs }}
                    />
                  )}
                  {row.ratingMu != null && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={<RatingBadge mu={row.ratingMu} sigma={row.ratingSigma} compact />}
                      sx={{ fontSize: TYPE_SCALE.xs }}
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
