import { Container, Skeleton, Stack, Box, Grid2 as Grid } from "@mui/material";

export default function SquadreLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Skeleton variant="text" width={180} height={40} sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Box sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <Skeleton variant="rectangular" height={8} />
              <Box sx={{ p: 2.5 }}>
                <Skeleton variant="text" width="70%" height={28} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mb: 1.5 }} />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="rectangular" width={60} height={22} sx={{ borderRadius: 3 }} />
                  <Skeleton variant="rectangular" width={80} height={22} sx={{ borderRadius: 3 }} />
                </Stack>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
