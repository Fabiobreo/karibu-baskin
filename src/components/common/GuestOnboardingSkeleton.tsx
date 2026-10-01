import { Box, Container, Paper, Skeleton } from "@mui/material";
import { RADIUS } from "@/lib/radius";
import { heroOverlapSx } from "@/lib/heroStyles";

interface GuestOnboardingSkeletonProps {
  /** Card "La tua prossima cosa da fare": una riga sola invece dei quattro passi. */
  compact?: boolean;
}

/**
 * Segnaposto della card in testa alla home ("I tuoi primi passi" o, con
 * `compact`, "La tua prossima cosa da fare"): stessa posizione e altezza
 * simile, così all'arrivo dei dati la pagina non salta.
 */
export default function GuestOnboardingSkeleton({ compact = false }: GuestOnboardingSkeletonProps) {
  return (
    <Container maxWidth="lg" sx={heroOverlapSx}>
      <Paper
        variant="outlined"
        sx={{ borderRadius: RADIUS.lg, p: compact ? { xs: 2.5, md: 3 } : { xs: 2.5, md: 3.5 } }}
      >
        <Skeleton width={compact ? 200 : 120} height={20} />
        {!compact && (
          <>
            <Skeleton width="45%" height={36} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={6} sx={{ mb: 2.5 }} />
          </>
        )}
        {(compact ? [0] : [0, 1, 2, 3]).map((i) => (
          <Box
            key={i}
            sx={{ display: "flex", gap: 1.5, alignItems: "center", py: compact ? 0.5 : 1.75 }}
          >
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="50%" />
              <Skeleton width="75%" />
            </Box>
          </Box>
        ))}
      </Paper>
    </Container>
  );
}
