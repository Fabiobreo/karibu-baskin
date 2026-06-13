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
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";
import TimerIcon from "@mui/icons-material/Timer";
import StarIcon from "@mui/icons-material/Star";
import GradeIcon from "@mui/icons-material/Grade";
import { ROLE_COLORS } from "@/lib/constants";
import { getRolesInfo, getBaskinRules } from "@/lib/content/baskinInfo";
import LoSapeviCarousel from "@/components/common/LoSapeviCarousel";

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
      <SiteHeader />

      <PageHero
        chip={t("ilbaskin.heroChip")}
        title={t("ilbaskin.heroTitle")}
        subtitle={t("ilbaskin.heroSubtitle")}
        subtitleMaxWidth={580}
      />

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {/* Storia */}
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="overline"
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("ilbaskin.origins")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 2, fontSize: { xs: "1.6rem", md: "2rem" } }}
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
          <Typography
            variant="overline"
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("ilbaskin.howItWorks")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}
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
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      {rule.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {rule.text}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 7 }} />

        {/* I ruoli */}
        <Box>
          <Typography
            variant="overline"
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("ilbaskin.thePlayers")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}
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
                {/* Header colorato */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    backgroundColor: ROLE_COLORS[r.role],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#fff" }}>
                    {r.label}
                  </Typography>
                  <Chip
                    label={r.tag}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                    }}
                  />
                </Box>

                {/* Body */}
                <Box sx={{ p: 2.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.75, mb: 2 }}
                  >
                    {r.description}
                  </Typography>
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
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            fontWeight={700}
                            sx={{
                              display: "block",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontSize: "0.65rem",
                            }}
                          >
                            {info.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ fontSize: "0.8rem", mt: 0.25 }}
                          >
                            {info.value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Container>
    </>
  );
}
