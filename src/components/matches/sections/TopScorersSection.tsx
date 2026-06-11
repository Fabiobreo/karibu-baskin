"use client";

import { Avatar, Box, Chip, Paper, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROLE_COLORS } from "@/lib/constants";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import type { MatchStatRow } from "@/components/matches/MatchStatsTable";

/** Card dei top 3 marcatori della partita (visibili a tutti se la partita è giocata). */
export default function TopScorersSection({ top3 }: { top3: MatchStatRow[] }) {
  const t = useTranslations("matches");
  const { sportRoleLabel } = useEntityLabels();
  if (top3.length === 0) return null;

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
        {t("topScorers")}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 1.5 }}>
        {top3.map((s, i) => {
          const athlete = s.user ?? s.child;
          const name = athlete?.name ?? "—";
          const role = athlete?.sportRole ?? null;
          const image = s.user?.image ?? null;
          const slug = s.user?.slug ?? s.user?.id ?? s.child?.slug ?? s.child?.id ?? null;

          const card = (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
                textAlign: "center",
                position: "relative",
                transition: "box-shadow 0.15s",
                ...(slug ? { "&:hover": { boxShadow: 2 } } : {}),
              }}
            >
              {i === 0 && (
                <StarIcon
                  sx={{ position: "absolute", top: 6, right: 6, fontSize: 14, color: "#FFB300" }}
                />
              )}
              <Avatar
                src={image ?? undefined}
                sx={{ width: 44, height: 44, fontSize: 16, mx: "auto", mb: 1 }}
              >
                {name[0]}
              </Avatar>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: "0.8rem" }}>
                {name}
              </Typography>
              {role && (
                <Chip
                  label={sportRoleLabel(role, athlete?.sportRoleVariant ?? null)}
                  size="small"
                  sx={{
                    bgcolor: ROLE_COLORS[role],
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.56rem",
                    height: 14,
                    mt: 0.5,
                  }}
                />
              )}
              <Typography
                sx={{
                  fontSize: "1.8rem",
                  fontWeight: 900,
                  color: "primary.main",
                  lineHeight: 1.1,
                  mt: 1,
                }}
              >
                {s.points}
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                fontWeight={600}
                sx={{ fontSize: "0.62rem" }}
              >
                {t("pointsUnit")}
              </Typography>
            </Paper>
          );

          return slug ? (
            <Link key={s.id} href={`/giocatori/${slug}`} style={{ textDecoration: "none" }}>
              {card}
            </Link>
          ) : (
            <Box key={s.id}>{card}</Box>
          );
        })}
      </Box>
    </Box>
  );
}
