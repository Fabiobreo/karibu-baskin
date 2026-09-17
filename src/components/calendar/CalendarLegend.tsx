"use client";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { useTranslations } from "next-intl";
import { seasonForDate } from "@/components/training/SessionRestrictionEditor";
import type { TeamInfo } from "@/components/calendar/calendarShared";
import { contrastText } from "@/lib/colorUtils";
import { decorationSx, teamFilterKey, typeColor, typeFilterKey } from "@/lib/calendar/eventColors";

interface CalendarLegendProps {
  teams: TeamInfo[];
  year: number;
  month: number;
  hiddenKeys: Set<string>;
  /** Squadre di chi guarda: in legenda portano lo stesso contorno dei chip. */
  myTeamIds?: string[];
  onToggleKey: (key: string) => void;
  onClearFilters: () => void;
}

/**
 * Legenda del calendario, su due assi che rispecchiano i colori della griglia:
 * il TIPO (quadratino pieno, stesso colore dello sfondo del chip) e la SQUADRA
 * (barretta verticale, stesso colore del bordo sinistro del chip). I toggle
 * nascondono/mostrano, e i filtri sono persistiti.
 */
export default function CalendarLegend({
  teams,
  year,
  month,
  hiddenKeys,
  myTeamIds = [],
  onToggleKey,
  onClearFilters,
}: CalendarLegendProps) {
  const t = useTranslations("calendar");
  const theme = useTheme();
  const viewedSeason = seasonForDate(new Date(year, month, 1));
  const seasonTeams = teams.filter((team) => team.season === viewedSeason);
  const mine = new Set(myTeamIds);

  const types = [
    { type: "training" as const, icon: <SportsBasketballIcon />, label: t("typeTraining") },
    { type: "match" as const, icon: <EmojiEventsIcon />, label: t("typeMatch") },
    { type: "event" as const, icon: <EventNoteIcon />, label: t("typeEvent") },
  ];

  return (
    <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
        <LegendCaption>{t("legendTypes")}</LegendCaption>
        {types.map(({ type, icon, label }) => {
          const color = typeColor(theme, type);
          return (
            <LegendItem
              key={type}
              label={label}
              active={!hiddenKeys.has(typeFilterKey(type))}
              onClick={() => onToggleKey(typeFilterKey(type))}
              swatch={
                <Paper
                  elevation={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    bgcolor: color,
                    borderRadius: "4px",
                    "& svg": { fontSize: "0.8rem", color: contrastText(color) },
                  }}
                >
                  {icon}
                </Paper>
              }
            />
          );
        })}
      </Box>

      {seasonTeams.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <LegendCaption>{t("legendTeams")}</LegendCaption>
          {seasonTeams.map((team) => (
            <LegendItem
              key={team.id}
              label={team.name}
              active={!hiddenKeys.has(teamFilterKey(team.id))}
              onClick={() => onToggleKey(teamFilterKey(team.id))}
              swatch={
                // Barretta verticale: è la stessa forma del bordo sinistro del
                // chip, così la legenda si lega a quello che si vede in griglia.
                // Le squadre di chi guarda portano anche il contorno, lo stesso
                // che marca i loro impegni nella griglia.
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: 5,
                      height: 18,
                      borderRadius: "3px",
                      bgcolor: team.color ?? "text.disabled",
                      ...decorationSx(theme, {
                        echo: mine.has(team.id) ? (team.color ?? null) : null,
                        echoGap: 2,
                        echoWidth: 2,
                      }),
                    }}
                  />
                </Box>
              }
            />
          ))}
        </Box>
      )}

      {hiddenKeys.size > 0 && (
        <Box>
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={t("showAll")}
            onClick={onClearFilters}
            onDelete={onClearFilters}
            sx={{ fontWeight: 700 }}
          />
        </Box>
      )}
    </Box>
  );
}

function LegendCaption({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        color: "text.disabled",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        minWidth: 62,
      }}
    >
      {children}
    </Typography>
  );
}

function LegendItem({
  swatch,
  label,
  active = true,
  onClick,
}: {
  swatch: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? active : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        cursor: onClick ? "pointer" : "default",
        opacity: active ? 1 : 0.38,
        transition: "opacity 0.15s",
        userSelect: "none",
        "&:hover": onClick ? { opacity: active ? 0.75 : 0.55 } : {},
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
          borderRadius: "4px",
        },
      }}
    >
      {swatch}
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
