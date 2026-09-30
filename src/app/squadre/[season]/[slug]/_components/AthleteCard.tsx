import { Avatar, Box, Paper, Tooltip, Typography } from "@mui/material";
import RoleBadge from "@/components/common/RoleBadge";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

import { getEntityLabels } from "@/lib/entityLabels";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export default async function AthleteCard({
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
  /** Hex della tinta squadra (da `teamColor()`), o null: nessun segno di colore. */
  teamColor: string | null;
}) {
  const { sportRoleLabel } = await getEntityLabels();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        border: "1px solid",
        borderColor: "divider",
        borderLeft: isCaptain && teamColor ? `4px solid ${teamColor}` : undefined,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        height: "100%",
      }}
    >
      <Avatar
        src={image}
        sx={{
          width: 48,
          height: 48,
          // Iniziale nella tinta squadra (etichetta bianca); senza tinta neutra (UX-29).
          bgcolor: teamColor ?? "action.selected",
          color: teamColor ? "common.white" : "text.primary",
          fontSize: TYPE_SCALE.lg,
          fontWeight: FONT_WEIGHT.bold,
          flexShrink: 0,
        }}
      >
        {name[0].toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
            {name}
          </Typography>
          {isCaptain && (
            <Tooltip title="Capitano">
              <EmojiEventsIcon sx={{ fontSize: 15, color: "medal.gold", flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
        {roleNum && <RoleBadge role={roleNum} variant={roleVariant ?? null} sx={{ mt: 0.4 }} />}
      </Box>
    </Paper>
  );
}
