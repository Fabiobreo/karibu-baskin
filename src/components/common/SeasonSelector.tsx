import { Box, Chip, Typography } from "@mui/material";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface SeasonSelectorProps {
  /** Stagioni fra cui scegliere, dalla più recente. */
  seasons: string[];
  /** La stagione mostrata nella pagina. */
  current: string;
  /** Pagina a cui si aggiunge `?season=`. */
  basePath: string;
  /**
   * Ricaduta: la stagione in corso (`active`) non ha ancora dati e si mostra
   * l'ultima che ne ha (`shown`). È l'unico avviso di stagione della pagina.
   */
  notice?: { active: string; shown: string } | null;
}

/**
 * Selettore di stagione delle pagine a stagioni (UX-36): dice sempre, in un
 * punto solo, di quale stagione sono i dati sotto. Con una sola stagione è una
 * riga di testo, con più stagioni sono chip da toccare.
 */
export default function SeasonSelector({
  seasons,
  current,
  basePath,
  notice,
}: SeasonSelectorProps) {
  const t = useTranslations("common");
  const selectable = seasons.length > 1;

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        component={selectable ? "nav" : "div"}
        aria-label={selectable ? t("seasonNav") : undefined}
        sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={FONT_WEIGHT.semibold}
          sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {t("seasonLabel")}
        </Typography>
        {selectable ? (
          seasons.map((s) => (
            <Link
              key={s}
              href={`${basePath}?season=${encodeURIComponent(s)}`}
              aria-current={s === current ? "true" : undefined}
              style={{ textDecoration: "none" }}
            >
              <Chip
                label={s}
                variant={s === current ? "filled" : "outlined"}
                color={s === current ? "primary" : "default"}
                sx={{ cursor: "pointer" }}
              />
            </Link>
          ))
        ) : (
          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
            {current}
          </Typography>
        )}
      </Box>

      {notice && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t("seasonNotStarted", notice)}
        </Typography>
      )}
    </Box>
  );
}
