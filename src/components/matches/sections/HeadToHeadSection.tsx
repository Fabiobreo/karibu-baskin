"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import type { PrevMatchPreview } from "@/components/matches/matchDetailTypes";
import { TYPE_SCALE } from "@/lib/typeScale";
import { MATCH_RESULT_META } from "@/lib/matches/matchResults";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** Scontri diretti con lo stesso avversario (partite precedenti con esito). */
export default function HeadToHeadSection({
  prevMatches,
  opponentName,
}: {
  prevMatches: PrevMatchPreview[];
  opponentName: string;
}) {
  const t = useTranslations("matches");
  const dateLocale = useActiveDateLocale();
  if (prevMatches.length === 0) return null;

  const RESULT_META: Record<string, { label: string; color: string }> = {
    WIN: { label: t("resultWin"), color: MATCH_RESULT_META.WIN.color },
    LOSS: { label: t("resultLoss"), color: MATCH_RESULT_META.LOSS.color },
    DRAW: { label: t("resultDraw"), color: MATCH_RESULT_META.DRAW.color },
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={FONT_WEIGHT.semibold}
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "block",
          mb: 1.5,
          fontSize: TYPE_SCALE.xs,
        }}
      >
        {t("headToHead", { opponentName })}
      </Typography>
      <Stack spacing={0.25}>
        {prevMatches.map((m) => {
          const score = m.ourScore !== null ? `${m.ourScore} – ${m.theirScore}` : "–";
          const resMeta = m.result ? RESULT_META[m.result] : null;

          const row = (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 0.9,
                borderRadius: RADIUS.md,
                ...(m.slug ? { cursor: "pointer", "&:hover": { bgcolor: "action.hover" } } : {}),
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 88, fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs }}
              >
                {format(new Date(m.date), "d MMM yyyy", { locale: dateLocale })}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={FONT_WEIGHT.bold}
                sx={{ minWidth: 52, fontSize: TYPE_SCALE.sm }}
              >
                {score}
              </Typography>
              {resMeta && (
                <Chip
                  label={resMeta.label}
                  size="small"
                  sx={{
                    bgcolor: resMeta.color,
                    color: "match.onFill",
                    fontSize: TYPE_SCALE.xs,
                    height: 20,
                  }}
                />
              )}
              <Box
                sx={{
                  ml: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "text.secondary",
                }}
              >
                {m.isHome ? (
                  <HomeIcon sx={{ fontSize: 13 }} />
                ) : (
                  <FlightIcon sx={{ fontSize: 13 }} />
                )}
                <Typography variant="caption" sx={{ fontSize: TYPE_SCALE.xs }}>
                  {m.isHome ? t("home") : t("away")}
                </Typography>
              </Box>
            </Box>
          );

          return m.slug ? (
            <Link
              key={m.id}
              href={`/partite/${m.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {row}
            </Link>
          ) : (
            <Box key={m.id}>{row}</Box>
          );
        })}
      </Stack>
    </Box>
  );
}
