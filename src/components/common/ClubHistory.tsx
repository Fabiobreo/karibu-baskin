import { Box, Stack, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import { getTranslations } from "next-intl/server";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

type StoriaItem = { anno: string; titolo: string; testo: string };

/**
 * "La nostra storia": la linea del tempo del club. La mostrano la home e
 * `/il-club` (UX-36b): stesso componente e stessi testi (`home.storia`).
 */
export default async function ClubHistory() {
  const t = await getTranslations("home");
  const storia = t.raw("storia") as StoriaItem[];

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {t("ourHistory")}
      </Typography>
      <Typography
        variant="h4"
        component="h2"
        sx={{ mt: 0.5, mb: 3, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 } }}
      >
        {t("tenYears")}
      </Typography>
      <Stack spacing={0}>
        {storia.map((item, i) => (
          <Box key={item.anno} sx={{ display: "flex", gap: 3 }}>
            {/* Timeline line */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "primary.fill",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <StarIcon sx={{ color: "common.white", fontSize: 18 }} />
              </Box>
              {i < storia.length - 1 && (
                // Server Component: niente sx a funzione (non serializzabile) →
                // token stringa theme-aware per la linea della timeline
                <Box sx={{ width: 2, flex: 1, bgcolor: "divider", my: 0.5 }} />
              )}
            </Box>
            {/* Content */}
            <Box sx={{ pb: i < storia.length - 1 ? 4 : 0 }}>
              <Typography
                // L'anno e' testo, non un'icona decorativa: neutro (UX-29).
                variant="caption"
                color="text.secondary"
                fontWeight={FONT_WEIGHT.semibold}
                sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {item.anno}
              </Typography>
              <Typography variant="subtitle1" component="h3" sx={{ mt: 0.25, mb: 0.75 }}>
                {item.titolo}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.75, maxWidth: 560 }}
              >
                {item.testo}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
