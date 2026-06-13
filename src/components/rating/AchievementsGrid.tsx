import { Box, Typography, LinearProgress } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { alpha } from "@mui/material/styles";
import {
  BADGE_CATEGORY_ORDER,
  BADGE_CATEGORY_LABELS,
  type BadgeCategory,
  type BadgeProgress,
  type BadgeTier,
} from "@/lib/rating/badges";

export type AchievementItem = BadgeProgress & { unlockedAtLabel?: string | null };

interface AchievementsGridProps {
  items: AchievementItem[];
  /** Etichette categoria tradotte; fallback alle label italiane di default. */
  categoryLabels?: Record<BadgeCategory, string>;
}

function tierColors(tier: BadgeTier) {
  return tier === "gold"
    ? { border: "medal.gold", bg: alpha("#F9A825", 0.1), text: "medal.gold" }
    : tier === "silver"
      ? { border: "medal.silver", bg: alpha("#9E9E9E", 0.12), text: "text.primary" }
      : { border: "medal.bronze", bg: alpha("#CD7F32", 0.1), text: "medal.bronze" };
}

function AchievementCard({ item }: { item: AchievementItem }) {
  const c = tierColors(item.tier);
  const earned = item.earned;
  const hasProgress = !earned && item.target != null && item.target > 0;
  const pct = hasProgress ? Math.min(100, ((item.current ?? 0) / item.target!) * 100) : 0;

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: "1.5px solid",
        borderColor: earned ? c.border : "divider",
        bgcolor: earned ? c.bg : "action.hover",
        opacity: earned ? 1 : 0.62,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": earned ? { transform: "translateY(-2px)", boxShadow: 3 } : undefined,
      }}
    >
      {/* Indicatore stato in alto a destra */}
      <Box sx={{ position: "absolute", top: 6, right: 6 }}>
        {earned ? (
          <CheckCircleIcon sx={{ fontSize: 16, color: c.text }} />
        ) : (
          <LockOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
        )}
      </Box>

      <Typography
        component="span"
        sx={{
          fontSize: { xs: "2rem", sm: "2.4rem" },
          lineHeight: 1,
          mb: 1,
          filter: earned ? "none" : "grayscale(1)",
        }}
      >
        {item.emoji}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          color: earned ? c.text : "text.secondary",
          lineHeight: 1.2,
          display: "block",
        }}
      >
        {item.label}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          color: "text.disabled",
          fontSize: "0.64rem",
          lineHeight: 1.3,
          display: "block",
          mt: 0.25,
        }}
      >
        {earned ? (item.unlockedAtLabel ?? item.description) : item.description}
      </Typography>

      {hasProgress && (
        <Box sx={{ width: "100%", mt: 1 }}>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 3 }} />
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontSize: "0.6rem", mt: 0.25, display: "block" }}
          >
            {item.current}/{item.target}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function AchievementsGrid({ items, categoryLabels }: AchievementsGridProps) {
  // Raggruppa per categoria, nell'ordine canonico, saltando le categorie vuote.
  const groups = BADGE_CATEGORY_ORDER.map((category) => ({
    category,
    label: categoryLabels?.[category] ?? BADGE_CATEGORY_LABELS[category],
    items: items.filter((b) => b.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {groups.map((group) => (
        <Box key={group.category}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}
          >
            {group.label} · {group.items.filter((b) => b.earned).length}/{group.items.length}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            {group.items.map((item) => (
              <AchievementCard key={item.id} item={item} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
