import { Box, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import type { BadgeTier } from "@/lib/rating/badges";
import { FONT_WEIGHT } from "@/lib/fontWeight";

const TIERS: BadgeTier[] = ["bronze", "silver", "gold"];

/**
 * Spiega i tre livelli dei traguardi (UX-17): senza, bronzo/argento/oro erano
 * solo colori diversi del bordo. Server Component, colori come token del tema.
 */
export default function BadgeTierLegend() {
  const t = useTranslations("badgeProgress");
  return (
    <Box sx={{ mb: 2 }}>
      <Box
        component="ul"
        sx={{ display: "flex", flexWrap: "wrap", gap: 2, listStyle: "none", m: 0, p: 0, mb: 0.5 }}
      >
        {TIERS.map((tier) => (
          <Box component="li" key={tier} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              aria-hidden
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: `medal.${tier}`,
                bgcolor: `medal.${tier}Bg`,
              }}
            />
            <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
              {t(`tier_${tier}`)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t("tierExplain")}
      </Typography>
    </Box>
  );
}
