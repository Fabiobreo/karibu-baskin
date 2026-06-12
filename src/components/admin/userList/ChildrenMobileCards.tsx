"use client";
import { Avatar, Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import RatingBadge from "@/components/rating/RatingBadge";
import { AthleteStatusChip, type ChildEntry } from "@/components/admin/userList/userListShared";

type ChildRow = ChildEntry & { kind: "child" };

interface ChildrenMobileCardsProps {
  rows: ChildRow[];
  currentSeason: string;
  hasSearch: boolean;
  onEdit: (row: ChildRow) => void;
  onDelete: (row: ChildRow) => void;
}

/** Vista a card del tab Figli senza account per viewport mobile. */
export default function ChildrenMobileCards({
  rows,
  currentSeason,
  hasSearch,
  onEdit,
  onDelete,
}: ChildrenMobileCardsProps) {
  return (
    <Box
      sx={{
        display: { xs: "block", sm: "none" },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      {rows.map((row) => {
        const team = row.teamMemberships.find((m) => m.team.season === currentSeason)?.team;
        return (
          <Box
            key={`child-${row.id}`}
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
              sx={{ width: 36, height: 36, fontSize: 14, bgcolor: "grey.400", flexShrink: 0 }}
            >
              {row.name[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                Figlio di {row.parent.name ?? row.parent.email}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                <AthleteStatusChip status={row.athleteStatus} />
                {row.sportRole && (
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
                )}
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
              <Tooltip title="Modifica figlio">
                <IconButton size="medium" aria-label="Modifica figlio" onClick={() => onEdit(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Elimina figlio">
                <IconButton
                  size="medium"
                  aria-label="Elimina figlio"
                  color="error"
                  onClick={() => onDelete(row)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        );
      })}
      {rows.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {hasSearch
              ? "Nessun risultato corrisponde alla ricerca."
              : "Nessun figlio senza account trovato."}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
