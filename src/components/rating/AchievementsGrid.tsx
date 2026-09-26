import { Box, Typography, LinearProgress } from "@mui/material";
import { useTranslations } from "next-intl";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BadgeTierLegend from "@/components/rating/BadgeTierLegend";
import {
  BADGE_CATEGORY_ORDER,
  BADGE_CATEGORY_LABELS,
  type BadgeCategory,
  type BadgeProgress,
  type BadgeTier,
} from "@/lib/rating/badges";
import { TYPE_SCALE } from "@/lib/typeScale";

export type AchievementItem = BadgeProgress & {
  /** Frase del traguardo raggiunto, al posto del criterio quando e' sbloccato. */
  achieved?: string;
  unlockedAtLabel?: string | null;
};

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
  const t = useTranslations("badgeProgress");
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
        // Niente sollevamento al passaggio del mouse: il traguardo non si
        // tocca, e una card che si muove promette un'azione (UX-07).
      }}
    >
      {/* Indicatore stato in alto a destra */}
      <Box sx={{ position: "absolute", top: 6, right: 6 }}>
        {earned ? (
          <CheckCircleIcon sx={{ fontSize: 16, color: c.text }} />
        ) : (
          <LockOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
        )}
      </Box>

      <Typography
        component="span"
        sx={{
          fontSize: { xs: TYPE_SCALE.xl4, sm: TYPE_SCALE.xl5 },
          lineHeight: 1,
          mb: 1,
          filter: earned ? "none" : "grayscale(1)",
        }}
      >
        {item.emoji}
      </Typography>

      <Typography
        sx={{
          fontSize: TYPE_SCALE.sm,
          fontWeight: 800,
          color: earned ? c.text : "text.secondary",
          lineHeight: 1.25,
          display: "block",
        }}
      >
        {item.label}
      </Typography>

      {/* Sbloccato: cosa ha fatto. Da raggiungere: il criterio per sbloccarlo. */}
      <Typography
        sx={{
          color: "text.secondary",
          fontSize: TYPE_SCALE.xs,
          lineHeight: 1.35,
          display: "block",
          mt: 0.5,
        }}
      >
        {earned ? (item.achieved ?? item.description) : item.description}
      </Typography>

      {/* La data di sblocco e' informazione secondaria: non compete col criterio. */}
      {earned && item.unlockedAtLabel && (
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: TYPE_SCALE.xs,
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
          <LinearProgress
            variant="determinate"
            value={pct}
            aria-label={item.label}
            aria-valuetext={t("value", { current: item.current ?? 0, target: item.target! })}
            sx={{ height: 5, borderRadius: 3 }}
          />
          <Typography
            sx={{ color: "text.secondary", fontSize: TYPE_SCALE.xs, mt: 0.25, display: "block" }}
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
      <BadgeTierLegend />
      {groups.map((group) => (
        <Box key={group.category}>
          <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
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
