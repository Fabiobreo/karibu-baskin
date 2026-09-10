import { Box, Typography, LinearProgress } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  BADGE_CATEGORY_ORDER,
  BADGE_CATEGORY_LABELS,
  type BadgeCategory,
  type BadgeProgress,
  type BadgeTier,
} from "@/lib/rating/badges";
import { onHover } from "@/lib/hoverStyles";

export type AchievementItem = BadgeProgress & { unlockedAtLabel?: string | null };

interface AchievementsGridProps {
  items: AchievementItem[];
  /** Etichette categoria tradotte; fallback alle label italiane di default. */
  categoryLabels?: Record<BadgeCategory, string>;
}

/**
 * Colori del livello come token del tema, non come valori risolti: questo
 * componente e' un Server Component, e una callback dentro `sx` non
 * attraversa il confine RSC.
 */
function tierColors(tier: BadgeTier) {
  const key = tier === "gold" ? "gold" : tier === "silver" ? "silver" : "bronze";
  return { border: `medal.${key}`, bg: `medal.${key}Bg`, text: `medal.${key}` };
}

function AchievementCard({ item }: { item: AchievementItem }) {
  const earned = item.earned;
  const c = tierColors(item.tier);
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
        // Sbloccato e da conquistare devono distinguersi senza leggere il
        // testo: colore del livello e bordo pieno contro grigio e tratteggio.
        // Prima cambiava solo il colore dell'icona.
        border: earned ? "1.5px solid" : "1.5px dashed",
        borderColor: earned ? c.border : "divider",
        bgcolor: earned ? c.bg : "transparent",
        // Desaturato, ma non sotto la soglia di leggibilita': il criterio va
        // letto anche sui bloccati, e' quello che dice come sbloccarli.
        filter: earned ? "none" : "saturate(0.25)",
        opacity: earned ? 1 : 0.85,
        boxShadow: earned ? 1 : "none",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...(earned ? onHover({ transform: "translateY(-2px)", boxShadow: 3 }) : {}),
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
        sx={{
          fontSize: "0.875rem",
          fontWeight: 800,
          color: earned ? c.text : "text.secondary",
          lineHeight: 1.25,
          display: "block",
        }}
      >
        {item.label}
      </Typography>

      {/* Il criterio dice come si sblocca: era a 0,64rem, cioe' circa 10px. */}
      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.75rem",
          lineHeight: 1.35,
          display: "block",
          mt: 0.5,
        }}
      >
        {item.description}
      </Typography>

      {/* La data di sblocco e' informazione secondaria: non compete col criterio. */}
      {earned && item.unlockedAtLabel && (
        <Typography
          sx={{
            color: "text.disabled",
            fontSize: "0.75rem",
            lineHeight: 1.35,
            display: "block",
            mt: 0.5,
            fontStyle: "italic",
          }}
        >
          {item.unlockedAtLabel}
        </Typography>
      )}

      {hasProgress && (
        <Box sx={{ width: "100%", mt: 1 }}>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 3 }} />
          <Typography
            sx={{ color: "text.secondary", fontSize: "0.75rem", mt: 0.25, display: "block" }}
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
