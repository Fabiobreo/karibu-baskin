import { Box, Typography, Paper, LinearProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Badge, LockedBadge } from "@/lib/rating/badges";

export type EarnedBadgeView = Badge & { unlockedAtLabel?: string | null };

interface BadgeShowcaseProps {
  earned: EarnedBadgeView[];
  locked?: LockedBadge[];
  /** Titolo della sezione (es. "I miei traguardi"). */
  title: string;
  /** Titolo del blocco "prossimi traguardi". */
  nextTitle?: string;
  /** Testo quando non ci sono ancora badge sbloccati. */
  emptyLabel?: string;
  /** Quanti badge "in arrivo" mostrare al massimo. */
  maxNext?: number;
}

function tierColors(tier: Badge["tier"]) {
  return tier === "gold"
    ? { border: "medal.gold", bg: alpha("#F9A825", 0.08), text: "medal.gold" }
    : tier === "silver"
      ? { border: "medal.silver", bg: "action.hover", text: "text.secondary" }
      : { border: "medal.bronze", bg: alpha("#CD7F32", 0.08), text: "medal.bronze" };
}

export default function BadgeShowcase({
  earned,
  locked = [],
  title,
  nextTitle,
  emptyLabel,
  maxNext = 3,
}: BadgeShowcaseProps) {
  // Prossimi traguardi: i bloccati più vicini al completamento.
  const next = [...locked]
    .filter((b) => b.target > 0)
    .sort((a, b) => b.current / b.target - a.current / a.target)
    .slice(0, maxNext);

  if (earned.length === 0 && next.length === 0 && !emptyLabel) return null;

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>

      {earned.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {earned.map((badge) => {
            const c = tierColors(badge.tier);
            return (
              <Box
                key={badge.id}
                title={badge.description}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  border: "1.5px solid",
                  borderColor: c.border,
                  bgcolor: c.bg,
                }}
              >
                <Typography sx={{ fontSize: "1.1rem", lineHeight: 1 }}>{badge.emoji}</Typography>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: c.text, display: "block", lineHeight: 1.2 }}
                  >
                    {badge.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.disabled", fontSize: "0.62rem", display: "block" }}
                  >
                    {badge.unlockedAtLabel ?? badge.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : emptyLabel ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : null}

      {next.length > 0 && (
        <Box sx={{ mt: earned.length > 0 ? 3 : 2 }}>
          {nextTitle && (
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, display: "block", mb: 1 }}
            >
              {nextTitle}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {next.map((badge) => (
              <Box key={badge.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography sx={{ fontSize: "1.1rem", lineHeight: 1, opacity: 0.5 }}>
                  {badge.emoji}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.25 }}>
                    <Typography variant="caption" fontWeight={700} noWrap>
                      {badge.label}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                      {badge.current}/{badge.target}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (badge.current / badge.target) * 100)}
                    sx={{ height: 5, borderRadius: 3 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
