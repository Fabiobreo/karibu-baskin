"use client";
import { Box, Typography, Paper, Chip } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { useHasMounted } from "@/lib/useHasMounted";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import type { MatchResult } from "@prisma/client";
import { useTranslations } from "next-intl";

export type AnyMatchProp = {
  id: string;
  slug: string | null;
  date: Date;
  isHome: boolean;
  matchType: "LEAGUE" | "TOURNAMENT" | "FRIENDLY";
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  venue: string | null;
  opponent: { id: string; name: string; city: string | null };
  isMirrored?: boolean;
};

function relativeLabel(
  date: Date,
  now: Date,
  tCommon: ReturnType<typeof useTranslations>,
  dateLocale: Locale
): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return tCommon("today");
  if (diffDays === 1) return tCommon("tomorrow");
  if (diffDays > 1 && diffDays <= 6)
    return format(date, "EEEE", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase());
  if (diffDays < 0 && diffDays >= -6)
    return format(date, "EEEE", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase());
  return format(date, "d MMM", { locale: dateLocale });
}

interface UpcomingMatchRowProps {
  match: AnyMatchProp;
  teamName: string;
  teamColor: string;
}

export default function UpcomingMatchRow({ match, teamName, teamColor }: UpcomingMatchRowProps) {
  const hasMounted = useHasMounted();
  const tCommon = useTranslations("common");
  const tMatches = useTranslations("matches");
  const dateLocale = useActiveDateLocale();
  const now = new Date();
  const leftName = match.isHome ? teamName : match.opponent.name;
  const rightName = match.isHome ? match.opponent.name : teamName;
  const leftIsUs = match.isHome;

  return (
    <Link href={`/partite/${match.slug ?? match.id}`} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderLeft: `4px solid ${teamColor}`,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          cursor: "pointer",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": {
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            borderColor: "text.disabled",
          },
        }}
      >
        <Box sx={{ minWidth: 90, flexShrink: 0 }}>
          <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
            {relativeLabel(match.date, now, tCommon, dateLocale)}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
            {format(new Date(match.date), "d MMM · HH:mm", { locale: dateLocale })}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 180,
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifyContent: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: leftIsUs ? 800 : 600,
              color: leftIsUs ? "text.primary" : "text.secondary",
              textAlign: "right",
              flex: "1 1 0",
              minWidth: 0,
            }}
          >
            {leftName}
          </Typography>
          <Typography sx={{ color: "text.disabled", fontWeight: 700, px: 0.5 }}>vs</Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: leftIsUs ? 600 : 800,
              color: leftIsUs ? "text.secondary" : "text.primary",
              textAlign: "left",
              flex: "1 1 0",
              minWidth: 0,
            }}
          >
            {rightName}
          </Typography>
        </Box>
        {/*
         * L'icona del Chip è condizionale (HomeIcon vs FlightIcon) e può causare
         * un hydration mismatch se un'estensione browser modifica il DOM prima
         * che React idrati. Usiamo `useHasMounted` per renderizzare l'icona
         * solo lato client, evitando la discrepanza strutturale SVG → span.
         */}
        <Chip
          icon={hasMounted ? match.isHome ? <HomeIcon /> : <FlightIcon /> : undefined}
          label={match.isHome ? tMatches("home") : tMatches("away")}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.65rem", height: 22 }}
        />
        <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
      </Paper>
    </Link>
  );
}
