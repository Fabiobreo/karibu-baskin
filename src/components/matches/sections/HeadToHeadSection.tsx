"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import type { PrevMatchPreview } from "@/components/matches/matchDetailTypes";

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
    WIN: { label: t("resultWin"), color: "#2E7D32" },
    LOSS: { label: t("resultLoss"), color: "#C62828" },
    DRAW: { label: t("resultDraw"), color: "#E65100" },
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="caption"
        color="text.disabled"
        fontWeight={700}
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "block",
          mb: 1.5,
          fontSize: "0.62rem",
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
                borderRadius: 1,
                ...(m.slug ? { cursor: "pointer", "&:hover": { bgcolor: "action.hover" } } : {}),
              }}
            >
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ minWidth: 88, fontWeight: 600, fontSize: "0.72rem" }}
              >
                {format(new Date(m.date), "d MMM yyyy", { locale: dateLocale })}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ minWidth: 52, fontSize: "0.85rem" }}
              >
                {score}
              </Typography>
              {resMeta && (
                <Chip
                  label={resMeta.label}
                  size="small"
                  sx={{
                    bgcolor: resMeta.color,
                    color: "common.white",
                    fontWeight: 700,
                    fontSize: "0.62rem",
                    height: 18,
                  }}
                />
              )}
              <Box
                sx={{
                  ml: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "text.disabled",
                }}
              >
                {m.isHome ? (
                  <HomeIcon sx={{ fontSize: 13 }} />
                ) : (
                  <FlightIcon sx={{ fontSize: 13 }} />
                )}
                <Typography variant="caption" sx={{ fontSize: "0.68rem" }}>
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
