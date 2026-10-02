import { Box, Container, Grid2 as Grid, Skeleton, Stack } from "@mui/material";
import { PageHeroFrame } from "@/components/common/PageHero";
import { RADIUS } from "@/lib/radius";
import { columnSx, type PageColumn } from "@/lib/layout";
import { heroText } from "@/lib/heroStyles";

interface PageLoadingSkeletonProps {
  /** Forma del contenuto sotto la hero. */
  variant?: "list" | "grid" | "table";
  /** Quanti elementi segnaposto. */
  items?: number;
  /** Colonna del contenuto, come nella pagina vera (UX-37): piena, principale o di lettura. */
  column?: PageColumn;
  /** Colonna della fascia, quando non e' quella del contenuto (sezione Partite, UX-36). */
  heroColumn?: PageColumn;
  /** Navigazione di sezione della pagina vera (UX-36): la fascia resta alta uguale. */
  nav?: React.ReactNode;
}

// Sulla hero scura lo skeleton di default (testo su sfondo chiaro) sparisce:
// stesso bianco trasparente che PageHero usa per il sottotitolo.
const onDark = { bgcolor: heroText.line };

/**
 * Skeleton per i `loading.tsx` delle pagine pubbliche con `PageHero`: la fascia
 * e' la stessa (`PageHeroFrame`), cosi' lo scatto verso il contenuto vero e' minimo.
 */
export default function PageLoadingSkeleton({
  variant = "list",
  items = 5,
  column = "full",
  heroColumn = column,
  nav,
}: PageLoadingSkeletonProps) {
  return (
    <Box aria-busy="true">
      <PageHeroFrame column={heroColumn} flush={!!nav}>
        <Skeleton variant="text" width="min(360px, 70%)" height={48} sx={onDark} />
        <Skeleton variant="text" width="min(300px, 60%)" height={24} sx={onDark} />
        {nav && <Box sx={{ mt: { xs: 1.5, md: 2 } }}>{nav}</Box>}
      </PageHeroFrame>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx(column)}>
          {variant === "grid" && (
            <Grid container spacing={2}>
              {Array.from({ length: items }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={200} />
                </Grid>
              ))}
            </Grid>
          )}

          {variant === "list" && (
            <Stack spacing={2}>
              {Array.from({ length: items }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    gap: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: RADIUS.lg,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    width={56}
                    height={56}
                    sx={{ flexShrink: 0, borderRadius: RADIUS.md }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="40%" height={20} />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}

          {variant === "table" && (
            <Box
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: RADIUS.lg, p: 2 }}
            >
              <Skeleton variant="text" width="100%" height={32} sx={{ mb: 1 }} />
              {Array.from({ length: items }).map((_, i) => (
                <Skeleton key={i} variant="text" width="100%" height={40} />
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
}
