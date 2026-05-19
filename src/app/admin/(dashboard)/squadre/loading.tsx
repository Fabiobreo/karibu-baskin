import { Container, Skeleton, Stack, Box } from "@mui/material";

export default function Loading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="text" width={240} height={44} sx={{ mb: 3 }} />
      <Stack spacing={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} sx={{ p: 2.5, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2 }}>
            <Skeleton variant="text" width="35%" height={26} sx={{ mb: 1 }} />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} variant="rounded" width={100} height={28} />
              ))}
            </Box>
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
