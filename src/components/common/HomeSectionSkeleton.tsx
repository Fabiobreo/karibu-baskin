import { Box, Container, Grid2 as Grid, Skeleton, Stack } from "@mui/material";

interface HomeSectionSkeletonProps {
  variant: "sessions" | "matches" | "news";
}

/** Intestazione delle sezioni home: icona + overline + titolo. */
function HeaderSkeleton() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
      <Skeleton variant="circular" width={32} height={32} />
      <Box>
        <Skeleton variant="text" width={90} height={16} />
        <Skeleton variant="text" width={220} height={32} />
      </Box>
    </Box>
  );
}

/**
 * Segnaposto delle sezioni della home mentre arrivano i dati (fallback dei
 * `<Suspense>` in `app/page.tsx`). Riprende padding e sfondo della sezione
 * vera, così la pagina non salta quando il contenuto sostituisce lo skeleton.
 */
export default function HomeSectionSkeleton({ variant }: HomeSectionSkeletonProps) {
  // La sezione allenamenti vive già dentro il Container #allenamenti della
  // pagina (ancora della CTA della hero): qui niente contenitore esterno.
  if (variant === "sessions") {
    return (
      <Box aria-hidden>
        <HeaderSkeleton />
        <Skeleton variant="rounded" height={220} />
      </Box>
    );
  }

  if (variant === "matches") {
    return (
      <Box aria-hidden sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <HeaderSkeleton />
          <Grid container spacing={2}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 4 }}>
                <Skeleton variant="rounded" height={140} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  return (
    <Box aria-hidden sx={{ bgcolor: "action.hover", py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <HeaderSkeleton />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Skeleton variant="rounded" height={320} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={96} />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
