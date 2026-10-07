import { Box, Button, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { albumPageHref } from "@/lib/gallery/albumPages";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface AlbumPaginationProps {
  slug: string;
  page: number;
  pages: number;
  /** Testi già tradotti (il componente sta in un Server Component). */
  labels: { nav: string; prev: string; next: string; position: string };
}

/**
 * "Precedente / Pagina 4 di 6 / Successiva" sotto la griglia di un album
 * (UX-52). Sono link veri: il numero di pagina sta nell'URL, quindi il tasto
 * indietro riporta dove si era e una pagina si può mandare a qualcuno.
 */
export default function AlbumPagination({ slug, page, pages, labels }: AlbumPaginationProps) {
  if (pages <= 1) return null;
  return (
    <Box
      component="nav"
      aria-label={labels.nav}
      sx={{
        mt: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 1, sm: 2 },
      }}
    >
      <Button
        variant="outlined"
        startIcon={<ChevronLeftIcon />}
        // Senza `href` è un bottone spento: sulla prima pagina non c'è dove andare.
        {...(page > 1 ? { href: albumPageHref(slug, page - 1) } : { disabled: true })}
        sx={{ minHeight: 44 }}
      >
        {labels.prev}
      </Button>
      <Typography
        variant="body2"
        aria-current="page"
        sx={{ fontWeight: FONT_WEIGHT.semibold, textAlign: "center", minWidth: 0 }}
      >
        {labels.position}
      </Typography>
      <Button
        variant="outlined"
        endIcon={<ChevronRightIcon />}
        {...(page < pages ? { href: albumPageHref(slug, page + 1) } : { disabled: true })}
        sx={{ minHeight: 44 }}
      >
        {labels.next}
      </Button>
    </Box>
  );
}
