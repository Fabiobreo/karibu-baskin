import { Container, Skeleton, Stack, Box } from "@mui/material";

export default function AllenamentiLoading() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
      <Stack spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, p: 2, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2 }}>
            <Skeleton variant="rectangular" width={56} height={56} sx={{ borderRadius: 1, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width={60} height={28} sx={{ borderRadius: 3 }} />
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
