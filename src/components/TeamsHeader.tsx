"use client";
import { Box, Typography, Tooltip, IconButton, CircularProgress } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import type { TeamsData } from "@/components/TeamDisplay";
import ShareTeamsButton from "@/components/ShareTeamsButton";

export default function TeamsHeader({
  teams,
  coaches,
  sessionTitle,
  isStaff,
  isEnded = false,
  removingTeams,
  onRemoveTeams,
  onEditTeams,
}: {
  teams: TeamsData | null;
  coaches?: { id: string; name: string }[];
  sessionTitle?: string;
  isStaff: boolean;
  isEnded?: boolean;
  removingTeams: boolean;
  onRemoveTeams: () => void;
  onEditTeams?: () => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
      <Typography variant="h6" fontWeight={700}>Squadre</Typography>
      {teams && (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {sessionTitle && (
            <ShareTeamsButton teams={teams} coaches={coaches} sessionTitle={sessionTitle} />
          )}
          {isStaff && !isEnded && onEditTeams && (
            <Tooltip title="Modifica squadre">
              <IconButton
                size="small"
                onClick={onEditTeams}
                sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isStaff && !isEnded && (
            <Tooltip title="Rimuovi squadre create">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={onRemoveTeams}
                  disabled={removingTeams}
                  sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
                >
                  {removingTeams
                    ? <CircularProgress size={16} color="error" />
                    : <DeleteOutlineIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
}
