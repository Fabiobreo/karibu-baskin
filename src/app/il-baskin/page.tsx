import { Box, Container, Typography, Grid2 as Grid, Paper, Stack } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { columnSx } from "@/lib/layout";
import { getTranslations, getLocale } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import BaskinCourtDiagram from "@/components/common/BaskinCourtDiagram";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";
import TimerIcon from "@mui/icons-material/Timer";
import StarIcon from "@mui/icons-material/Star";
import GradeIcon from "@mui/icons-material/Grade";
import { roleColorSx } from "@/lib/constants";
import {
  getRolesInfo,
  getBaskinRules,
  RULE_VISIBLE_ITEMS,
  type RuleInfo,
} from "@/lib/content/baskinInfo";
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

// Il campo non ha una card: lo racconta lo schema, con la sua legenda (UX-41).
const RULE_ICONS: Record<Exclude<RuleInfo["key"], "court">, React.ReactNode> = {
  duration: <TimerIcon />,
  team: <PeopleAltIcon />,
  pivots: <AccessibilityNewIcon />,
  points: <GradeIcon />,
  special: <StarIcon />,
};

const sectionTitleSx = {
  mt: 0.5,
  fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 },
} as const;

// Area che si apre: i dettagli restano nella pagina, chiusi (UX-41).
const detailsSx = {
  "& > summary": {
    cursor: "pointer",
    typography: "body2",
    fontWeight: FONT_WEIGHT.semibold,
    color: "primary.onLight",
    // Riga da toccare alta 44 px.
    py: 1.5,
  },
} as const;

const itemSx = { lineHeight: 1.6, mb: 0.5 } as const;

// Etichetta di un dato del ruolo (canestro, punteggio, chi lo marca).
const factLabelSx = {
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} as const;

export default async function IlBaskinPage() {
  const [t, locale] = await Promise.all([getTranslations("pages"), getLocale()]);
  const ROLES_INFO = getRolesInfo(locale);
  const RULES = getBaskinRules(locale).filter(
    (rule): rule is RuleInfo & { key: keyof typeof RULE_ICONS } => rule.key !== "court"
  );
  const FACTS = [t("ilbaskin.fact1"), t("ilbaskin.fact2"), t("ilbaskin.fact3")];

  return (
    <>
      <PageHero
        column="reading"
        title={t("ilbaskin.heroTitle")}
        subtitle={t("ilbaskin.heroSubtitle")}
      />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
        <Stack spacing={{ xs: 4, md: 6 }} sx={columnSx("reading")}>
          {/* Tre cose da sapere: chi legge solo questo ha gia' capito lo sport. */}
          <Box component="section">
            <Typography variant="overline" color="text.secondary">
              {t("ilbaskin.inBrief")}
            </Typography>
            <Typography variant="h4" component="h2" sx={{ ...sectionTitleSx, mb: 1.5 }}>
              {t("ilbaskin.threeThings")}
            </Typography>
            <Stack component="ol" spacing={1.25} sx={{ m: 0, p: 0, listStyle: "none" }}>
              {FACTS.map((fact, i) => (
                <Box component="li" key={fact} sx={{ display: "flex", gap: 1.5 }}>
                  <Typography
                    component="span"
                    aria-hidden="true"
                    variant="h5"
                    sx={{ width: 24, flexShrink: 0, color: "text.secondary", lineHeight: 1.3 }}
                  >
                    {i + 1}
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {fact}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Il campo */}
          <Box component="section">
            <Typography variant="overline" color="text.secondary">
              {t("ilbaskin.whereWePlay")}
            </Typography>
            <Typography variant="h4" component="h2" sx={{ ...sectionTitleSx, mb: 1.5 }}>
              {t("ilbaskin.courtTitle")}
            </Typography>
            <BaskinCourtDiagram />
          </Box>

          {/* I ruoli */}
          <Box component="section">
            <Typography variant="overline" color="text.secondary">
              {t("ilbaskin.thePlayers")}
            </Typography>
            <Typography variant="h4" component="h2" sx={{ ...sectionTitleSx, mb: 1 }}>
              {t("ilbaskin.the5Roles")}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              {t("ilbaskin.rolesIntro")}
            </Typography>
            <Stack spacing={2}>
              {ROLES_INFO.map((r) => {
                // "Ruolo 1: Il Pivot Fisso": il numero va in grande, il nome accanto.
                const name = r.label.split(": ").slice(1).join(": ") || r.tag;
                const prefix = r.label.slice(0, r.label.length - name.length);
                return (
                  <Paper
                    key={r.role}
                    elevation={0}
                    sx={{ overflow: "hidden", border: "1px solid", borderColor: "divider" }}
                  >
                    {/* Fascia nel colore del ruolo (UX-29), testo bianco: il
                        numero e' il secondo segnale. */}
                    <Typography
                      variant="subtitle1"
                      component="h3"
                      sx={{
                        px: 2.5,
                        py: 1,
                        ...roleColorSx(r.role),
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box component="span" sx={visuallyHidden}>
                        {prefix}
                      </Box>
                      <Typography
                        component="span"
                        aria-hidden="true"
                        variant="h4"
                        sx={{ minWidth: 20, fontVariantNumeric: "tabular-nums" }}
                      >
                        {r.role}
                      </Typography>
                      {name}
                    </Typography>

                    <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
                      {/* La prima frase dice cosa fa in campo; le altre sono sotto. */}
                      <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 1.5 }}>
                        {r.summary[0]}
                      </Typography>

                      {/* Canestro e punti restano visibili: sono quello che
                          distingue un ruolo dall'altro, e quello che mostra lo schema. */}
                      <Box
                        component="dl"
                        sx={{
                          m: 0,
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                          columnGap: 3,
                          rowGap: 1,
                        }}
                      >
                        {[
                          { label: t("ilbaskin.roleCanestro"), value: r.canestro },
                          { label: t("ilbaskin.rolePunteggio"), value: r.punteggio },
                        ].map((info) => (
                          <Box key={info.label}>
                            <Typography
                              component="dt"
                              variant="caption"
                              color="text.secondary"
                              fontWeight={FONT_WEIGHT.semibold}
                              sx={factLabelSx}
                            >
                              {info.label}
                            </Typography>
                            <Typography
                              component="dd"
                              variant="body2"
                              fontWeight={FONT_WEIGHT.semibold}
                              sx={{ m: 0 }}
                            >
                              {info.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      <Box component="details" sx={{ ...detailsSx, mt: 1 }}>
                        <summary>{t("ilbaskin.roleMore")}</summary>
                        <Box sx={{ pb: 1.5 }}>
                          <Box component="ul" sx={{ m: 0, mb: 1.5, pl: 2.5 }}>
                            {r.summary.slice(1).map((line) => (
                              <Typography key={line} component="li" variant="body1" sx={itemSx}>
                                {line}
                              </Typography>
                            ))}
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={FONT_WEIGHT.semibold}
                            sx={factLabelSx}
                          >
                            {t("ilbaskin.roleMarcatura")}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={FONT_WEIGHT.semibold}
                            sx={{ mb: 1.5 }}
                          >
                            {r.marcatura}
                          </Typography>
                          {/* Il testo tecnico resta per allenatori e arbitri. */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={FONT_WEIGHT.semibold}
                            sx={factLabelSx}
                          >
                            {t("ilbaskin.fullRules")}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ lineHeight: 1.75 }}
                          >
                            {r.description}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          </Box>

          {/* Regole */}
          <Box component="section">
            <Typography variant="overline" color="text.secondary">
              {t("ilbaskin.howItWorks")}
            </Typography>
            <Typography variant="h4" component="h2" sx={{ ...sectionTitleSx, mb: 3 }}>
              {t("ilbaskin.mainRules")}
            </Typography>
            <Grid container spacing={2}>
              {RULES.map((rule) => {
                const more = rule.items.slice(RULE_VISIBLE_ITEMS);
                return (
                  <Grid key={rule.key} size={{ xs: 12, sm: 6 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 2.5,
                        pt: 2.5,
                        pb: more.length > 0 ? 1 : 2.5,
                        display: "flex",
                        gap: 2,
                        alignItems: "flex-start",
                        border: "1px solid",
                        borderColor: "divider",
                        height: "100%",
                      }}
                    >
                      <Box sx={{ color: "primary.main", mt: 0.3, flexShrink: 0 }}>
                        {RULE_ICONS[rule.key]}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
                          {rule.title}
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                          {rule.items.slice(0, RULE_VISIBLE_ITEMS).map((item) => (
                            <Typography
                              key={item}
                              component="li"
                              variant="body2"
                              color="text.secondary"
                              sx={itemSx}
                            >
                              {item}
                            </Typography>
                          ))}
                        </Box>
                        {more.length > 0 && (
                          <Box component="details" sx={detailsSx}>
                            <summary>{t("ilbaskin.moreRules")}</summary>
                            <Box component="ul" sx={{ m: 0, pl: 2.5, pb: 1 }}>
                              {more.map((item) => (
                                <Typography
                                  key={item}
                                  component="li"
                                  variant="body2"
                                  color="text.secondary"
                                  sx={itemSx}
                                >
                                  {item}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Storia: per chi vuole saperne di piu', dopo il come si gioca. */}
          <Box component="section">
            <Typography variant="overline" color="text.secondary">
              {t("ilbaskin.origins")}
            </Typography>
            <Typography variant="h4" component="h2" sx={{ ...sectionTitleSx, mb: 1.5 }}>
              {t("ilbaskin.born2001")}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              {t("ilbaskin.historyText")}
            </Typography>
          </Box>

          <LoSapeviCarousel />
        </Stack>
      </Container>
    </>
  );
}
