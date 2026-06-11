"use client";
import { Box, Chip, Paper, Typography } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { useTranslations } from "next-intl";
import { seasonForDate } from "@/components/training/SessionRestrictionEditor";
import type { TeamInfo } from "@/components/calendar/calendarShared";

interface CalendarLegendProps {
  teams: TeamInfo[];
  year: number;
  month: number;
  hiddenKeys: Set<string>;
  onToggleKey: (key: string) => void;
  onClearFilters: () => void;
}

/** Legenda del calendario: i toggle nascondono/mostrano i tipi di evento (filtri persistiti). */
export default function CalendarLegend({
  teams,
  year,
  month,
  hiddenKeys,
  onToggleKey,
  onClearFilters,
}: CalendarLegendProps) {
  const t = useTranslations("calendar");
  const viewedSeason = seasonForDate(new Date(year, month, 1));
  const seasonTeams = teams.filter((team) => team.season === viewedSeason);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 3, alignItems: "center" }}>
      <LegendItem
        color="admin.allenamenti"
        icon={<SportsBasketballIcon sx={{ fontSize: "0.8rem", color: "common.white" }} />}
        label={t("typeTraining")}
        active={!hiddenKeys.has("training")}
        onClick={() => onToggleKey("training")}
      />
      {seasonTeams.length > 0 ? (
        seasonTeams.map((team) => {
          const matchKey = `match:${team.color ?? "#C62828"}`;
          return (
            <LegendItem
              key={team.id}
              color={team.color ?? "match.loss"}
              icon={<EmojiEventsIcon sx={{ fontSize: "0.8rem", color: "common.white" }} />}
              label={team.name}
              active={!hiddenKeys.has(matchKey)}
              onClick={() => onToggleKey(matchKey)}
            />
          );
        })
      ) : (
        <LegendItem
          color="error.main"
          icon={<EmojiEventsIcon sx={{ fontSize: "0.8rem", color: "common.white" }} />}
          label={t("typeMatch")}
          active={!hiddenKeys.has("match:*")}
          onClick={() => onToggleKey("match:*")}
        />
      )}
      <LegendItem
        color="#039BE5"
        icon={<EventNoteIcon sx={{ fontSize: "0.8rem", color: "common.white" }} />}
        label={t("typeEvent")}
        active={!hiddenKeys.has("event")}
        onClick={() => onToggleKey("event")}
      />
      {hiddenKeys.size > 0 && (
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={t("showAll")}
          onClick={onClearFilters}
          onDelete={onClearFilters}
          sx={{ fontWeight: 700 }}
        />
      )}
    </Box>
  );
}

function LegendItem({
  color,
  icon,
  label,
  active = true,
  onClick,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        cursor: onClick ? "pointer" : "default",
        opacity: active ? 1 : 0.38,
        transition: "opacity 0.15s",
        userSelect: "none",
        "&:hover": onClick ? { opacity: active ? 0.75 : 0.55 } : {},
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          bgcolor: active ? color : "action.disabled",
          borderRadius: "4px",
          transition: "background-color 0.15s",
        }}
      >
        {icon}
      </Paper>
      <Typography
        variant="body2"
        sx={{
          color: active ? "text.secondary" : "text.disabled",
          textDecoration: active ? "none" : "line-through",
          transition: "color 0.15s",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
