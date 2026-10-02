import { Box, ButtonBase } from "@mui/material";
import { useTranslations } from "next-intl";
import { heroText } from "@/lib/heroStyles";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import {
  MATCHES_SECTIONS,
  matchesSectionHref,
  type MatchesSection,
} from "@/lib/matches/sectionNav";

interface MatchesSectionNavProps {
  /** La pagina in cui ci si trova. */
  current: MatchesSection;
  /** Stagione scelta a mano dall'utente: segue fra Risultati, Classifiche e Marcatori. */
  season?: string | null;
}

/**
 * Navigazione della sezione Partite (UX-36), nello slot `nav` di `PageHero`:
 * le stesse quattro voci su tutte e quattro le pagine, attaccate al bordo basso
 * della fascia. Sono link a pagine, non tab di un pannello: la voce corrente si
 * annuncia con `aria-current="page"` e si vede dal filo arancio (stato attivo).
 */
export default function MatchesSectionNav({ current, season }: MatchesSectionNavProps) {
  const t = useTranslations("matches.sectionNav");

  return (
    <Box
      component="nav"
      aria-label={t("label")}
      sx={{
        display: "flex",
        // Su telefono le voci si dividono la riga, da tablet stanno a sinistra.
        justifyContent: { xs: "space-between", sm: "flex-start" },
        // Il testo della prima voce sta sopra il titolo, non il suo padding.
        mx: { xs: -0.75, sm: -2 },
        // Sotto i 360 px le quattro voci non ci stanno: scorrono, senza barra.
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {MATCHES_SECTIONS.map((section) => {
        const active = section.key === current;
        return (
          <ButtonBase
            key={section.key}
            href={matchesSectionHref(section.key, season)}
            aria-current={active ? "page" : undefined}
            sx={{
              flex: "0 0 auto",
              alignItems: "stretch",
              minHeight: 44,
              px: { xs: 0.75, sm: 2 },
              typography: "body2",
              fontWeight: FONT_WEIGHT.semibold,
              whiteSpace: "nowrap",
              color: active ? heroText.primary : heroText.muted,
              "&:hover": { color: heroText.primary, bgcolor: heroText.surface },
              // Il contenitore scorre e taglierebbe un anello esterno.
              "&:focus-visible": { outlineOffset: -3, boxShadow: "none" },
            }}
          >
            {/* Il filo sta sotto la parola, non sotto il padding: parte dal
                bordo della colonna, come il titolo. */}
            <Box
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: "3px solid",
                borderBottomColor: active ? "primary.main" : "transparent",
              }}
            >
              {t(section.key)}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
