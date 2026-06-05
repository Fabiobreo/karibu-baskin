"use client";

import { Box, Chip, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { useHasMounted } from "@/lib/useHasMounted";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import type { Locale } from "date-fns";

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
      <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
        {format(date, "EEEE d MMM", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase())}
      </Typography>
    );
  }

  const now = new Date();
  const isImminent = date.getTime() <= now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
        {relativeLabel(date, now, tCommon, dateLocale)}
      </Typography>
      {isImminent && (
        <Chip
          icon={<BoltIcon sx={{ fontSize: 12 }} />}
          label={tMatches("imminent")}
          size="small"
          sx={{
            fontWeight: 800,
            fontSize: "0.6rem",
            height: 18,
            bgcolor: "primary.main",
            color: "#fff",
            "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
          }}
        />
      )}
    </Box>
  );
}
