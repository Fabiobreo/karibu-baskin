import { Box, Typography, Paper, LinearProgress } from "@mui/material";
import { useTranslations } from "next-intl";
import { medalTier, type Badge, type LockedBadge } from "@/lib/rating/badges";
import BadgeTierLegend from "@/components/rating/BadgeTierLegend";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export type EarnedBadgeView = Badge & {
  /** Frase del traguardo raggiunto ("Hai segnato 10 punti in una partita"). */
  achieved?: string;
  unlockedAtLabel?: string | null;
};

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

/**
 * Colori del livello come token del tema: questo e' un Server Component, e una
 * callback dentro `sx` non attraversa il confine RSC.
 */
export default function BadgeShowcase({
  earned,
  locked = [],
  title,
  nextTitle,
  emptyLabel,
  maxNext = 3,
}: BadgeShowcaseProps) {
  const t = useTranslations("badgeProgress");
  // Prossimi traguardi: i bloccati più vicini al completamento.
  const next = [...locked]
    .filter((b) => b.target > 0)
    .sort((a, b) => b.current / b.target - a.current / a.target)
    .slice(0, maxNext);

  if (earned.length === 0 && next.length === 0 && !emptyLabel) return null;

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography component="h2" variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      {earned.length > 0 && <BadgeTierLegend />}

      {earned.length > 0 ? (
        // Griglia e non chip affiancati: con la frase sempre visibile ogni
        // traguardo e' una riga di testo, non un'etichetta corta.
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: 1.5,
          }}
        >
          {earned.map((badge) => {
            const c = medalTier(badge.tier);
            return (
              <Box
                key={badge.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: RADIUS.md,
                  border: "1.5px solid",
                  borderColor: c.border,
                  bgcolor: c.bg,
                }}
              >
                <Typography sx={{ fontSize: TYPE_SCALE.lg, lineHeight: 1 }}>
                  {badge.emoji}
                </Typography>
                <Box>
                  <Typography
                    sx={{
                      fontSize: TYPE_SCALE.sm,
                      fontWeight: FONT_WEIGHT.bold,
                      color: c.text,
                      display: "block",
                      lineHeight: 1.25,
                    }}
                  >
                    {badge.label}
                  </Typography>
                  {/* Frase fissa sempre visibile (UX-17): prima il sottotitolo era a
                      volte la data e a volte il criterio, e la descrizione stava
                      solo nel `title`, invisibile su touch. */}
                  <Typography variant="caption" color="text.primary" sx={{ display: "block" }}>
                    {badge.achieved ?? badge.description}
                  </Typography>
                  {badge.unlockedAtLabel && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {badge.unlockedAtLabel}
                    </Typography>
                  )}
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
            <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {nextTitle}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {next.map((badge) => (
              <Box key={badge.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {/* I "prossimi" sono desaturati: si distinguono dagli sbloccati
                    senza doverne leggere l'etichetta. Il grigio basta a dire
                    "bloccato": con meno opacita' l'icona quasi spariva. */}
                <Typography
                  sx={{
                    fontSize: TYPE_SCALE.lg,
                    lineHeight: 1,
                    filter: "grayscale(1)",
                  }}
                >
                  {badge.emoji}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.25 }}>
                    <Typography
                      sx={{ fontSize: TYPE_SCALE.sm, fontWeight: FONT_WEIGHT.semibold }}
                      noWrap
                    >
                      {badge.label}
                    </Typography>
                    <Typography
                      sx={{ fontSize: TYPE_SCALE.xs, color: "text.secondary", flexShrink: 0 }}
                    >
                      {badge.current}/{badge.target}
                    </Typography>
                  </Box>
                  {/* Il criterio: cosa serve per raggiungerlo. */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    {badge.description}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (badge.current / badge.target) * 100)}
                    // Nome e avanzamento per il lettore di schermo: la barra da
                    // sola annuncerebbe solo una percentuale senza contesto.
                    aria-label={badge.label}
                    aria-valuetext={t("value", { current: badge.current, target: badge.target })}
                    sx={{ height: 5, borderRadius: RADIUS.pill }}
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
