"use client";

import { Box, Chip, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { useHasMounted } from "@/lib/useHasMounted";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import StatusPill from "@/components/common/StatusPill";

const IMMINENT_HOURS = 48;

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
  if (diffDays > 1 && diffDays <= 6) {
    return format(date, "EEEE", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase());
  }
  return tCommon("daysAway", { count: diffDays });
}

export default function MatchTimeCell({ dateIso }: { dateIso: string }) {
  const hasMounted = useHasMounted();
  const tCommon = useTranslations("common");
  const tMatches = useTranslations("matches");
  const dateLocale = useActiveDateLocale();
  const date = new Date(dateIso);

  if (!hasMounted) {
    return (
      <Typography variant="body2" fontWeight={FONT_WEIGHT.bold} sx={{ fontSize: TYPE_SCALE.sm }}>
        {format(date, "EEEE d MMM", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase())}
      </Typography>
    );
  }

  const now = new Date();
  const isImminent = date.getTime() <= now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000;
  const isToday = date.toDateString() === now.toDateString();

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      {isToday ? (
        // "Oggi" e' uno stato temporale (UX-29): nero del marchio invertito, non una tinta.
        <StatusPill label={tCommon("today")} />
      ) : (
        <Typography variant="body2" fontWeight={FONT_WEIGHT.bold} sx={{ fontSize: TYPE_SCALE.sm }}>
          {relativeLabel(date, now, tCommon, dateLocale)}
        </Typography>
      )}
      {isImminent && !isToday && (
        <Chip
          icon={<BoltIcon sx={{ fontSize: 12 }} />}
          label={tMatches("imminent")}
          size="small"
          sx={{
            fontWeight: FONT_WEIGHT.bold,
            fontSize: TYPE_SCALE.xs,
            height: 20,
            // Neutro (UX-29): l'arancio vuol dire "si tocca", e questo chip non si tocca.
            bgcolor: "action.selected",
            color: "text.primary",
            "& .MuiChip-icon": { ml: "4px", mr: "-4px", color: "text.secondary" },
          }}
        />
      )}
    </Box>
  );
}
