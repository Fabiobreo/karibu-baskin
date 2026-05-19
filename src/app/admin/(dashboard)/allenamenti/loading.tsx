import { Container, Skeleton, Stack, Box } from "@mui/material";

export default function Loading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="text" width={260} height={44} sx={{ mb: 3 }} />
      <Stack spacing={2}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ p: 2.5, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2 }}>
            <Skeleton variant="text" width="45%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="65%" height={20} />
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
