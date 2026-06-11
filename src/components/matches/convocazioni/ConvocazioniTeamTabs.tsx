"use client";
import { Box, Chip, Paper, Tab, Tabs } from "@mui/material";
import type { TeamCallupContext } from "@/lib/callupContext";
import type { TeamSelectionState } from "@/hooks/useConvocazioniSelection";

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
          "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.92rem" },
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
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: t.color ?? "primary.main",
                    }}
                  />
                  <span>{t.name}</span>
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.7rem",
                      bgcolor: idx === activeIndex ? "primary.main" : "action.hover",
                      color: idx === activeIndex ? "common.white" : "text.secondary",
                      fontWeight: 800,
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
