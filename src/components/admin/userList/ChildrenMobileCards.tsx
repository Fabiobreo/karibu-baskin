"use client";
import TeamChip from "@/components/teams/TeamChip";
import { Avatar, Box, Typography } from "@mui/material";
import RoleBadge from "@/components/common/RoleBadge";
import { AthleteStatusChip, type ChildEntry } from "@/components/admin/userList/userListShared";
import { PersonCardButton, PersonRowMenu } from "@/components/admin/userList/PersonRowControls";
import { childOfLabel } from "@/lib/guardianNames";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
        borderRadius: RADIUS.lg,
      }}
    >
      {rows.map((row) => {
        const team = row.teamMemberships.find((m) => m.team.season === currentSeason)?.team;
        return (
          <Box
            key={`child-${row.id}`}
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
            <PersonCardButton name={row.name} onOpen={() => onEdit(row)}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: TYPE_SCALE.sm,
                  bgcolor: "grey.400",
                  flexShrink: 0,
                }}
              >
                {row.name[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
                  {row.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  display="block"
                  sx={{ fontStyle: "italic" }}
                >
                  {childOfLabel(
                    row.gender,
                    row.guardians.map((g) => g.name?.trim() || g.email)
                  )}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                  <AthleteStatusChip status={row.athleteStatus} />
                  {row.sportRole && (
                    <RoleBadge role={row.sportRole} variant={row.sportRoleVariant} />
                  )}
                  {team && (
                    <TeamChip
                      name={team.name}
                      color={team.color}
                      sx={{ fontSize: TYPE_SCALE.xs }}
                    />
                  )}
                </Box>
              </Box>
            </PersonCardButton>
            {/* Un figlio senza account lo elimina anche l'allenatore (così l'API). */}
            <PersonRowMenu
              name={row.name}
              canDelete
              onOpen={() => onEdit(row)}
              onDelete={() => onDelete(row)}
            />
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
