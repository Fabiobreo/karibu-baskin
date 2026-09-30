import { Box, Breadcrumbs, Container, Link as MuiLink, Typography } from "@mui/material";
import type { ContainerProps } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import type { ReactNode } from "react";
import type { BreadcrumbItem } from "@/components/common/PageHeader";
import { heroBottomBorder, heroGradient, heroText } from "@/lib/heroStyles";
import { TYPE_SCALE } from "@/lib/typeScale";

/**
 * Entity hero (UX-32), uno dei tre modelli di intestazione del sito: il
 * dettaglio di un allenamento, un evento, una partita, un giocatore, una
 * squadra o un'avversaria. Stessa struttura ovunque:
 *
 * 1. breadcrumb su una riga sua (l'ultima voce si tronca), a destra le azioni
 *    dello staff ("Gestisci");
 * 2. titolo h1 allineato al breadcrumb, con un elemento facoltativo a sinistra
 *    (avatar, iniziale della squadra);
 * 3. sottotitolo, badge (stato, ruolo, squadra), riga meta (data, ora, luogo);
 * 4. contenuto proprio dell'entita' (il tabellino della partita, le statistiche
 *    del giocatore) e in fondo la condivisione.
 *
 * Niente "use client" e niente `sx` a funzione: si usa sia nei Server sia nei
 * Client Component. I colori sul fondo scuro vengono da `heroText`.
 */
interface EntityHeroProps {
  breadcrumb: BreadcrumbItem[];
  title: string;
  /** H1 solo per chi naviga a voce (la partita: il titolo e' il tabellino). */
  hideTitle?: boolean;
  /**
   * Fondo (CSS `background-image`): `heroTint(colore)` per la tinta
   * dell'entita', `heroImage(url)` per una foto. Di default il grafite.
   */
  background?: string;
  /** Azioni dello staff, sulla riga del breadcrumb. */
  manage?: ReactNode;
  /** Elemento a sinistra del titolo (avatar, iniziale). */
  leading?: ReactNode;
  subtitle?: ReactNode;
  /** Pillole sotto il titolo: stato, ruolo, squadra. */
  badges?: ReactNode;
  /** Riga meta: una serie di `HeroMeta`. */
  meta?: ReactNode;
  /** Condivisione, in fondo. */
  actions?: ReactNode;
  maxWidth?: ContainerProps["maxWidth"];
  children?: ReactNode;
}

interface HeroMetaProps {
  icon: ReactNode;
  children: ReactNode;
}

/** Una voce della riga meta: icona piccola e testo (o link). */
export function HeroMeta({ icon, children }: HeroMetaProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
        "& > svg": { fontSize: TYPE_SCALE.md, flexShrink: 0 },
      }}
    >
      {icon}
      <Typography variant="body2" component="span" sx={{ minWidth: 0 }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function EntityHero({
  breadcrumb,
  title,
  hideTitle = false,
  background = heroGradient.dark,
  manage,
  leading,
  subtitle,
  badges,
  meta,
  actions,
  maxWidth = "md",
  children,
}: EntityHeroProps) {
  const last = breadcrumb[breadcrumb.length - 1];
  const hasPhoto = background.includes("url(");

  return (
    <Box
      style={{
        backgroundImage: background,
        backgroundSize: hasPhoto ? "cover" : undefined,
        backgroundPosition: hasPhoto ? "center" : undefined,
      }}
      sx={{
        ...heroBottomBorder,
        color: "common.white",
        pt: { xs: 1.5, md: 2 },
        pb: { xs: 3, md: 4 },
      }}
    >
      <Container maxWidth={maxWidth}>
        {/* Breadcrumb e azioni dello staff su una riga propria: posizionati
            sopra il contenuto, a 360 px andavano a capo e si sovrapponevano. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            minHeight: 40,
            mb: { xs: 2, md: 3 },
          }}
        >
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              minWidth: 0,
              flex: "1 1 auto",
              "& .MuiBreadcrumbs-separator": { color: heroText.muted, flexShrink: 0 },
              // Una riga sola: l'ultima voce si tronca, le altre restano intere.
              "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" },
              "& .MuiBreadcrumbs-li": { minWidth: 0, overflow: "hidden" },
              "& .MuiBreadcrumbs-li:not(:last-of-type)": { flexShrink: 0 },
            }}
          >
            {breadcrumb.slice(0, -1).map((item) => (
              <MuiLink
                key={item.label}
                href={item.href}
                underline="hover"
                variant="body2"
                sx={{
                  color: heroText.muted,
                  whiteSpace: "nowrap",
                  // Area di tocco di almeno 24 px (WCAG 2.5.8).
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 24,
                  "&:hover": { color: "common.white" },
                }}
              >
                {item.label}
              </MuiLink>
            ))}
            <Typography variant="body2" sx={{ color: heroText.secondary, minWidth: 0 }} noWrap>
              {last.label}
            </Typography>
          </Breadcrumbs>
          {manage && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              {manage}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 2, md: 3 },
          }}
        >
          {leading && <Box sx={{ flexShrink: 0 }}>{leading}</Box>}
          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <Typography
              variant="h3"
              component="h1"
              sx={
                hideTitle
                  ? visuallyHidden
                  : {
                      fontSize: { xs: TYPE_SCALE.xl3, sm: TYPE_SCALE.xl4, md: TYPE_SCALE.xl5 },
                      lineHeight: 1.15,
                      overflowWrap: "anywhere",
                    }
              }
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" sx={{ mt: 0.5, color: heroText.secondary }}>
                {subtitle}
              </Typography>
            )}
            {badges && (
              <Box
                sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}
              >
                {badges}
              </Box>
            )}
            {meta && (
              <Box
                sx={{
                  mt: 1.5,
                  display: "flex",
                  flexWrap: "wrap",
                  columnGap: 2.5,
                  rowGap: 0.75,
                  color: heroText.secondary,
                }}
              >
                {meta}
              </Box>
            )}
            {children}
            {actions && <Box sx={{ mt: 2.5 }}>{actions}</Box>}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
