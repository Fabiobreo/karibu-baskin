import { Box, Container, IconButton, Link as MuiLink, Typography } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import SponsorBanner from "@/components/common/SponsorBanner";
import { heroGradient, heroText, socialBrandColor } from "@/lib/heroStyles";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";
import { CLUB_VENUE, CLUB_VENUE_LABEL, TRY_IT_HREF, mapsSearchUrl } from "@/lib/clubVenue";
import {
  CLUB_EMAIL,
  CLUB_LEGAL_NAME,
  CLUB_PHONES,
  CLUB_SOCIAL,
  CLUB_TAX_ID,
} from "@/lib/clubContacts";

// Link del footer: testo chiaro sottolineato. Sotto `md` il footer è a una
// colonna e si usa col dito: ogni link è un bersaglio da 44 px (UX-45).
const linkSx = {
  display: { xs: "inline-flex", md: "inline-block" },
  alignItems: "center",
  verticalAlign: { xs: "top", md: "baseline" },
  minHeight: { xs: TOUCH_TARGET_SIZE, md: 0 },
  minWidth: { xs: TOUCH_TARGET_SIZE, md: 0 },
  py: { xs: 0, md: 0.5 },
  color: heroText.secondary,
  textDecorationColor: heroText.lineStrong,
  "&:hover": { color: heroText.primary },
} as const;

// Telefoni: si tocca tutta la riga "nome + numero", sottolineato resta il numero.
const phoneLinkSx = {
  ...linkSx,
  columnGap: 0.5,
  "& > span": { textDecoration: "underline", textDecorationColor: heroText.lineStrong },
  "&:hover > span": { textDecorationColor: "inherit" },
} as const;

const SOCIAL = [
  { label: "Instagram", href: CLUB_SOCIAL.instagram, Icon: InstagramIcon, hover: "instagram" },
  { label: "Facebook", href: CLUB_SOCIAL.facebook, Icon: FacebookIcon, hover: "facebook" },
  { label: "YouTube", href: CLUB_SOCIAL.youtube, Icon: YouTubeIcon, hover: "youtube" },
] as const;

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      component="h2"
      sx={{ display: "block", color: heroText.muted, mb: 0.5 }}
    >
      {children}
    </Typography>
  );
}

/**
 * Chiusura di ogni pagina pubblica (UX-39), anche su telefono: gli sponsor in
 * cima, poi dove siamo, i link del sito e i contatti. E' quello che un genitore
 * cerca in fondo alla pagina.
 */
export default async function Footer() {
  const [t, tNav] = await Promise.all([getTranslations("footer"), getTranslations("nav")]);
  const year = new Date().getFullYear();

  const siteLinks = [
    { href: "/allenamenti", label: tNav("trainings") },
    { href: "/il-baskin", label: tNav("baskin") },
    { href: "/calendario", label: tNav("calendar") },
    { href: "/squadre", label: tNav("teams") },
    { href: "/il-club", label: tNav("whoWeAre") },
    { href: "/partite", label: tNav("matches") },
    { href: "/faq", label: tNav("faq") },
    { href: "/news", label: tNav("news") },
    { href: "/sponsor", label: tNav("sponsor") },
  ];

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        background: heroGradient.footer,
        color: heroText.secondary,
        // Su telefono la barra di navigazione in basso copre il fondo pagina.
        pb: { xs: "calc(60px + env(safe-area-inset-bottom, 0px))", md: 0 },
      }}
    >
      <Container maxWidth="lg">
        {/* ── Sponsor ── */}
        <Box sx={{ pt: { xs: 2, md: 2.5 }, pb: { xs: 3, md: 3.5 } }}>
          <SponsorBanner />
        </Box>

        {/* ── Tre colonne (una su telefono) ── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr 1.2fr" },
            gap: { xs: 3, md: 6 },
            py: { xs: 3, md: 4 },
            borderTop: `1px solid ${heroText.line}`,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                style={{ objectFit: "contain" }}
              />
              <Typography component="div" variant="subtitle1" sx={{ color: heroText.primary }}>
                Karibu Baskin
              </Typography>
            </Box>
            <ColumnTitle>{t("whereWhen")}</ColumnTitle>
            <Typography variant="body2" component="address" sx={{ fontStyle: "normal" }}>
              <Box component="strong" sx={{ color: heroText.primary }}>
                {CLUB_VENUE.name}
              </Box>
              <br />
              {CLUB_VENUE.street} · {CLUB_VENUE.postalCode} {CLUB_VENUE.city} ({CLUB_VENUE.province}
              )
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <MuiLink
                variant="body2"
                href={mapsSearchUrl(CLUB_VENUE_LABEL)}
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
              >
                {t("openMaps")}
              </MuiLink>
              <MuiLink variant="body2" href="/allenamenti" sx={linkSx}>
                {t("nextTrainings")}
              </MuiLink>
              <MuiLink variant="body2" href={TRY_IT_HREF} sx={linkSx}>
                {t("tryIt")}
              </MuiLink>
            </Box>
          </Box>

          <Box component="nav" aria-label={t("navLabel")}>
            <ColumnTitle>{t("site")}</ColumnTitle>
            <Box
              component="ul"
              sx={{
                listStyle: "none",
                m: 0,
                p: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 3,
              }}
            >
              {siteLinks.map((l) => (
                <li key={l.href}>
                  <MuiLink variant="body2" href={l.href} sx={linkSx}>
                    {l.label}
                  </MuiLink>
                </li>
              ))}
            </Box>
          </Box>

          <Box>
            <ColumnTitle>{t("contacts")}</ColumnTitle>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <MuiLink variant="body2" href={`mailto:${CLUB_EMAIL}`} sx={linkSx}>
                {CLUB_EMAIL}
              </MuiLink>
              {CLUB_PHONES.map((p) => (
                <MuiLink
                  key={p.href}
                  variant="body2"
                  underline="none"
                  href={p.href}
                  sx={phoneLinkSx}
                >
                  {p.name} <span>{p.label}</span>
                </MuiLink>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, ml: { xs: -1.5, md: -1 } }}>
              {SOCIAL.map(({ label, href, Icon, hover }) => (
                <IconButton
                  key={label}
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  sx={{
                    minWidth: { xs: TOUCH_TARGET_SIZE, md: 0 },
                    minHeight: { xs: TOUCH_TARGET_SIZE, md: 0 },
                    color: heroText.secondary,
                    "&:hover": { color: socialBrandColor[hover] },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>
          </Box>
        </Box>

        {/* ── Riga legale ── */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            columnGap: 3,
            py: 1.5,
            borderTop: `1px solid ${heroText.line}`,
          }}
        >
          <Typography variant="caption" sx={{ color: heroText.muted }}>
            © {year} {CLUB_LEGAL_NAME} · {t("taxId")} {CLUB_TAX_ID}
          </Typography>
          <MuiLink variant="caption" href="/privacy" sx={linkSx}>
            {tNav("privacyPolicy")}
          </MuiLink>
        </Box>
      </Container>
    </Box>
  );
}
