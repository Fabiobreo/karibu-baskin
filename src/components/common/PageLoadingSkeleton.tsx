import { Box, Container, Grid2 as Grid, Skeleton, Stack } from "@mui/material";
import type { ContainerProps } from "@mui/material";
import PageHero from "@/components/common/PageHero";

interface PageLoadingSkeletonProps {
  /** Forma del contenuto sotto la hero. */
  variant?: "list" | "grid" | "table";
  /** Quanti elementi segnaposto. */
  items?: number;
  /** Larghezza del Container del contenuto, come nella pagina vera. */
  maxWidth?: ContainerProps["maxWidth"];
  /** Allineamento della hero, come nella pagina vera. */
  heroAlign?: "center" | "left";
  /** Padding verticale della hero, come nella pagina vera. */
  heroPy?: { xs: number; md: number };
}

// Sulla hero scura lo skeleton di default (testo su sfondo chiaro) sparisce:
// stesso bianco trasparente che PageHero usa per il sottotitolo.
const onDark = { bgcolor: "rgba(255,255,255,0.14)" };

/**
 * Skeleton per i `loading.tsx` delle pagine pubbliche con `PageHero`: la hero
 * resta scura e alta uguale, così lo scatto verso il contenuto vero è minimo.
 */
export default function PageLoadingSkeleton({
  variant = "list",
  items = 5,
  maxWidth = "md",
  heroAlign = "center",
  heroPy,
}: PageLoadingSkeletonProps) {
  const centered = heroAlign === "center";
  return (
    <Box aria-busy="true">
      <PageHero align={heroAlign} py={heroPy}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: centered ? "center" : "flex-start",
          }}
        >
          <Skeleton
            variant="rounded"
            width={90}
            height={24}
            sx={{ ...onDark, mb: 2, borderRadius: 4 }}
          />
          <Skeleton variant="text" width="min(420px, 80%)" height={56} sx={onDark} />
          <Skeleton variant="text" width="min(360px, 70%)" height={28} sx={onDark} />
        </Box>
      </PageHero>

      <Container maxWidth={maxWidth} sx={{ py: { xs: 4, md: 6 } }}>
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
                  borderRadius: 2,
                }}
              >
                <Skeleton
                  variant="rounded"
                  width={56}
                  height={56}
                  sx={{ flexShrink: 0, borderRadius: 1 }}
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
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
            <Skeleton variant="text" width="100%" height={32} sx={{ mb: 1 }} />
            {Array.from({ length: items }).map((_, i) => (
              <Skeleton key={i} variant="text" width="100%" height={40} />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
