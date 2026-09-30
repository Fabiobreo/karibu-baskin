import { Box, Container, Typography } from "@mui/material";
import { heroBottomBorder, heroGradient, heroText } from "@/lib/heroStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { columnSx, type PageColumn } from "@/lib/layout";

/**
 * Page header delle liste pubbliche (UX-32), uno dei tre modelli di
 * intestazione del sito: fascia grafite bassa (120 px su desktop, 96 su
 * mobile), testo allineato a sinistra al bordo della griglia unica (`lg`,
 * UX-37), niente chip
 * sopra il titolo, niente icona. L'altezza e' la stessa su tutte le liste.
 */
interface PageHeroProps {
  title: string;
  /** Una riga facoltativa sotto il titolo. */
  subtitle?: React.ReactNode;
  /** Breadcrumb facoltativo sopra il titolo (liste di secondo livello). */
  breadcrumb?: React.ReactNode;
  /** Navigazione di sezione facoltativa sotto il titolo (UX-36). */
  nav?: React.ReactNode;
  /** Azione facoltativa a destra del titolo (su mobile va sotto). */
  action?: React.ReactNode;
  /** Colonna della pagina (UX-37): la stessa del contenuto sotto, cosi' titolo e azione stanno sopra di lui. */
  column?: PageColumn;
}

interface PageHeroFrameProps {
  column?: PageColumn;
  children: React.ReactNode;
}

/** La fascia senza contenuto: la usa anche lo skeleton dei `loading.tsx`. */
export function PageHeroFrame({ column = "full", children }: PageHeroFrameProps) {
  return (
    <Box
      style={{ backgroundImage: heroGradient.band }}
      sx={{
        ...heroBottomBorder,
        color: "common.white",
        minHeight: { xs: 96, md: 120 },
        py: { xs: 2, md: 2.5 },
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="lg">
        <Box sx={columnSx(column)}>{children}</Box>
      </Container>
    </Box>
  );
}

export default function PageHero({
  title,
  subtitle,
  breadcrumb,
  nav,
  action,
  column,
}: PageHeroProps) {
  return (
    <PageHeroFrame column={column}>
      {breadcrumb && <Box sx={{ mb: 1 }}>{breadcrumb}</Box>}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1.5, sm: 3 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontSize: { xs: TYPE_SCALE.xl3, md: TYPE_SCALE.xl5 } }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                mt: 0.5,
                color: heroText.secondary,
                fontSize: { xs: TYPE_SCALE.sm, md: TYPE_SCALE.md },
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
      {nav && <Box sx={{ mt: 2 }}>{nav}</Box>}
    </PageHeroFrame>
  );
}
