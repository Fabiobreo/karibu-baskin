"use client";

import { Avatar, Box, Paper, Typography } from "@mui/material";
import RoleBadge from "@/components/common/RoleBadge";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useEntityLabels } from "@/hooks/useEntityLabels";
import type { MatchStatRow } from "@/components/matches/MatchStatsTable";
import { TYPE_SCALE } from "@/lib/typeScale";

/** Card dei top 3 marcatori della partita (visibili a tutti se la partita è giocata). */
export default function TopScorersSection({ top3 }: { top3: MatchStatRow[] }) {
  const t = useTranslations("matches");
  const { sportRoleLabel } = useEntityLabels();
  if (top3.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "block",
          mb: 1.5,
          fontSize: TYPE_SCALE.xs,
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
                  sx={{ position: "absolute", top: 6, right: 6, fontSize: 14, color: "medal.gold" }}
                />
              )}
              <Avatar
                src={image ?? undefined}
                sx={{ width: 44, height: 44, fontSize: TYPE_SCALE.md, mx: "auto", mb: 1 }}
              >
                {name[0]}
              </Avatar>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: TYPE_SCALE.xs }}>
                {name}
              </Typography>
              {role && (
                <RoleBadge
                  role={role}
                  variant={athlete?.sportRoleVariant ?? null}
                  sx={{ mt: 0.5 }}
                />
              )}
              <Typography
                sx={{
                  fontSize: TYPE_SCALE["3xl"],
                  fontWeight: 900,
                  color: "text.primary",
                  lineHeight: 1.1,
                  mt: 1,
                }}
              >
                {s.points}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ fontSize: TYPE_SCALE.xs }}
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
