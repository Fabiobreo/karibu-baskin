import { Box, Tooltip, Typography } from "@mui/material";

interface RatingBadgeProps {
  /** μ TrueSkill (skill attesa). null = giocatore non ancora valutato. */
  mu: number | null;
  /** σ TrueSkill (incertezza). null = non valutato. */
  sigma: number | null;
  /** Variante compatta (solo numero) per le card mobile. */
  compact?: boolean;
}

/**
 * Badge skill TrueSkill — visibile solo nelle viste COACH/ADMIN (il chiamante
 * garantisce il contesto). Mostra μ come valore principale e σ come incertezza.
 * Non valutato → trattino. Il rating resta nascosto agli utenti normali.
 */
export default function RatingBadge({ mu, sigma, compact }: RatingBadgeProps) {
  if (mu == null || sigma == null) {
    return (
      <Typography variant="body2" color="text.disabled" component="span">
        —
      </Typography>
    );
  }

  // σ basso = stima affidabile. Sopra questa soglia il dato è ancora "in rodaggio".
  const reliable = sigma < 5;
  const muLabel = mu.toFixed(1);
  const sigmaLabel = sigma.toFixed(1);

  return (
    <Tooltip
      title={`Skill TrueSkill: μ ${muLabel} · incertezza ±${sigmaLabel}${
        reliable ? "" : " (stima ancora in rodaggio)"
      }`}
    >
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5, whiteSpace: "nowrap" }}
      >
        <Typography
          variant="body2"
          component="span"
          sx={{ fontWeight: 600, color: reliable ? "text.primary" : "text.secondary" }}
        >
          {muLabel}
        </Typography>
        {!compact && (
          <Typography variant="caption" component="span" color="text.disabled">
            ±{sigmaLabel}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}
