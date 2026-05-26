import { Avatar, Box, Chip, Paper, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";

export default function AthleteCard({
  name,
  image,
  roleNum,
  roleVariant,
  isCaptain,
  teamColor,
}: {
  name: string;
  image?: string;
  roleNum: number | null | undefined;
  roleVariant: string | null | undefined;
  isCaptain: boolean;
  teamColor: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        border: "1px solid",
        borderColor: "divider",
        borderLeft: isCaptain ? `4px solid ${teamColor}` : undefined,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        height: "100%",
        transition: "all 0.12s",
        "&:hover": { borderColor: teamColor, backgroundColor: alpha(teamColor, 0.031) },
      }}
    >
      <Avatar
        src={image}
        sx={{
          width: 48,
          height: 48,
          bgcolor: teamColor,
          fontSize: 18,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {name[0].toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {name}
          </Typography>
          {isCaptain && (
            <Tooltip title="Capitano">
              <EmojiEventsIcon sx={{ fontSize: 15, color: "medal.gold", flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
        {roleNum && (
          <Chip
            label={sportRoleLabel(roleNum, roleVariant ?? null)}
            size="small"
            sx={{
              mt: 0.4,
              bgcolor: ROLE_COLORS[roleNum],
              color: "common.white",
              fontWeight: 700,
              fontSize: "0.65rem",
              height: 18,
            }}
          />
        )}
      </Box>
    </Paper>
  );
}
