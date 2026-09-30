import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Chip,
  Divider,
  Stack,
} from "@mui/material";
import { getTranslations, getLocale } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";
import TimerIcon from "@mui/icons-material/Timer";
import StarIcon from "@mui/icons-material/Star";
import GradeIcon from "@mui/icons-material/Grade";
import { roleColorSx } from "@/lib/constants";
import { heroText } from "@/lib/heroStyles";
import { getRolesInfo, getBaskinRules } from "@/lib/content/baskinInfo";
import LoSapeviCarousel from "@/components/common/LoSapeviCarousel";
import { buildMetadata } from "@/lib/seo";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const metadata = buildMetadata({
  title: "Il Baskin",
  description:
    "Che cos'è il Baskin: le regole, i cinque ruoli e perché è uno sport in cui può giocare davvero chiunque.",
  path: "/il-baskin",
});

const RULE_ICONS = [
  <SportsBasketballIcon key="0" />,
  <TimerIcon key="1" />,
  <PeopleAltIcon key="2" />,
  <AccessibilityNewIcon key="3" />,
  <GradeIcon key="4" />,
  <StarIcon key="5" />,
];

export default async function IlBaskinPage() {
  const [t, locale] = await Promise.all([getTranslations("pages"), getLocale()]);
  const ROLES_INFO = getRolesInfo(locale);
  const RULES = getBaskinRules(locale);

  return (
    <>
      <PageHero title={t("ilbaskin.heroTitle")} subtitle={t("ilbaskin.heroSubtitle")} />

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {/* Storia */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="overline" color="text.secondary">
            {t("ilbaskin.origins")}
          </Typography>
          <Typography
            variant="h4"
            component="h2"
            sx={{ mt: 0.5, mb: 2, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl4 } }}
          >
            {t("ilbaskin.born2001")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {t("ilbaskin.historyText")}
          </Typography>
        </Box>

        {/* Lo sapevi? */}
        <Box sx={{ mb: 5 }}>
          <LoSapeviCarousel />
        </Box>

        {/* Regole */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="text.secondary">
            {t("ilbaskin.howItWorks")}
          </Typography>
          <Typography
            variant="h4"
            component="h2"
            sx={{ mt: 0.5, mb: 3, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl4 } }}
          >
            {t("ilbaskin.mainRules")}
          </Typography>
          <Grid container spacing={2}>
            {RULES.map((rule, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    display: "flex",
                    gap: 2,
                    alignItems: "flex-start",
                    border: "1px solid",
                    borderColor: "divider",
                    height: "100%",
                  }}
                >
                  <Box sx={{ color: "primary.main", mt: 0.3, flexShrink: 0 }}>{RULE_ICONS[i]}</Box>
                  <Box>
                    <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
                      {rule.title}
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {rule.items.map((item) => (
                        <Typography
                          key={item}
                          component="li"
                          variant="body2"
                          color="text.secondary"
                          sx={{ lineHeight: 1.6, mb: 0.5 }}
                        >
                          {item}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 7 }} />

        {/* I ruoli */}
        <Box>
          <Typography variant="overline" color="text.secondary">
            {t("ilbaskin.thePlayers")}
          </Typography>
          <Typography
            variant="h4"
            component="h2"
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl4 } }}
          >
            {t("ilbaskin.the5Roles")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t("ilbaskin.rolesIntro")}
          </Typography>
          <Stack spacing={2}>
            {ROLES_INFO.map((r) => (
              <Paper
                key={r.role}
                elevation={0}
                sx={{ overflow: "hidden", border: "1px solid", borderColor: "divider" }}
              >
                {/* Intestazione nel colore del ruolo (UX-29), testo bianco. */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    ...roleColorSx(r.role),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle1" component="h3" sx={{ color: "common.white" }}>
                    {r.label}
                  </Typography>
                  <Chip
                    label={r.tag}
                    size="small"
                    sx={{
                      backgroundColor: heroText.surfaceHover,
                      color: "common.white",
                      fontSize: TYPE_SCALE.xs,
                    }}
                  />
                </Box>

                {/* Body */}
                <Box sx={{ p: 2.5 }}>
                  {/* Cosa fa in campo, una frase per riga: lo leggono gli atleti stessi. */}
                  <Box component="ul" sx={{ m: 0, mb: 2, pl: 2.5, maxWidth: "65ch" }}>
                    {r.summary.map((line) => (
                      <Typography
                        key={line}
                        component="li"
                        variant="body1"
                        sx={{ lineHeight: 1.6, mb: 0.5 }}
                      >
                        {line}
                      </Typography>
                    ))}
                  </Box>
                  {/* Badge info */}
                  <Grid container spacing={1}>
                    {[
                      { label: t("ilbaskin.roleCanestro"), value: r.canestro },
                      { label: t("ilbaskin.rolePunteggio"), value: r.punteggio },
                      { label: t("ilbaskin.roleMarcatura"), value: r.marcatura },
                    ].map((info) => (
                      <Grid key={info.label} size={{ xs: 12, sm: 4 }}>
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            backgroundColor: "action.hover",
                            borderRadius: RADIUS.md,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={FONT_WEIGHT.semibold}
                            sx={{
                              display: "block",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontSize: TYPE_SCALE.xs,
                            }}
                          >
                            {info.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={FONT_WEIGHT.semibold}
                            sx={{ fontSize: TYPE_SCALE.xs, mt: 0.25 }}
                          >
                            {info.value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  {/* Il testo tecnico resta per coach e arbitri, chiuso di default. */}
                  <Box
                    component="details"
                    sx={{
                      mt: 2,
                      "& > summary": {
                        cursor: "pointer",
                        typography: "body2",
                        fontWeight: FONT_WEIGHT.semibold,
                        color: "primary.onLight",
                        py: 0.5,
                      },
                    }}
                  >
                    <summary>{t("ilbaskin.fullRules")}</summary>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.75, mt: 1 }}
                    >
                      {r.description}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Container>
    </>
  );
}
