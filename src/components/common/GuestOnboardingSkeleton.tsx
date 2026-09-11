import { Box, Container, Paper, Skeleton } from "@mui/material";

/**
 * Segnaposto della card "I tuoi primi passi" in home: stessa sovrapposizione
 * alla hero e altezza simile, così all'arrivo dei dati la pagina non salta.
 */
export default function GuestOnboardingSkeleton() {
  return (
    <Container maxWidth="md">
      <Paper
        elevation={8}
        sx={{
          position: "relative",
          zIndex: 2,
          borderRadius: 3,
          p: { xs: 2.5, md: 3.5 },
          mt: { xs: -7, md: -10 },
        }}
      >
        <Skeleton width={120} height={20} />
        <Skeleton width="45%" height={36} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={6} sx={{ mb: 2.5 }} />
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "center", py: 1.75 }}>
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
