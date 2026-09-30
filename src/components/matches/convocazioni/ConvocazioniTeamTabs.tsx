"use client";
import TeamColorDot from "@/components/teams/TeamColorDot";
import { Box, Chip, Paper, Tab, Tabs } from "@mui/material";
import type { TeamCallupContext } from "@/lib/matches/callupContext";
import type { TeamSelectionState } from "@/hooks/useConvocazioniSelection";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** Tab per le due squadre delle amichevoli interne, con conteggio convocati. */
export default function ConvocazioniTeamTabs({
  teams,
  activeIndex,
  onChange,
  selectionByTeam,
}: {
  teams: TeamCallupContext[];
  activeIndex: number;
  onChange: (index: number) => void;
  selectionByTeam: Map<string, TeamSelectionState>;
}) {
  return (
    <Paper variant="outlined" elevation={0} sx={{ mb: 2 }}>
      <Tabs
        value={activeIndex}
        onChange={(_, v) => onChange(v as number)}
        variant="fullWidth"
        sx={{
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: FONT_WEIGHT.semibold,
            fontSize: TYPE_SCALE.sm,
          },
        }}
      >
        {teams.map((t, idx) => {
          const sel = selectionByTeam.get(t.id);
          const count = sel ? sel.userIds.size + sel.childIds.size : 0;
          return (
            <Tab
              key={t.id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TeamColorDot color={t.color} size={10} />
                  <span>{t.name}</span>
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: TYPE_SCALE.xs,
                      bgcolor: idx === activeIndex ? "primary.fill" : "action.hover",
                      color: idx === activeIndex ? "common.white" : "text.secondary",
                      fontWeight: FONT_WEIGHT.bold,
                    }}
                  />
                </Box>
              }
            />
          );
        })}
      </Tabs>
    </Paper>
  );
}
