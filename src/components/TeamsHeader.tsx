"use client";
import { Box, Typography, Tooltip, IconButton, CircularProgress } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { TeamsData } from "@/components/TeamDisplay";

export default function TeamsHeader({
  teams,
  isStaff,
  isEnded = false,
  removingTeams,
  onRemoveTeams,
}: {
  teams: TeamsData | null;
  isStaff: boolean;
  isEnded?: boolean;
  removingTeams: boolean;
  onRemoveTeams: () => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
      <Typography variant="h6" fontWeight={700}>Squadre</Typography>
      {isStaff && teams && !isEnded && (
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
  );
}
