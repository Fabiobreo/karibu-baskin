import { Container, Skeleton, Stack, Box } from "@mui/material";

export default function Loading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="text" width={200} height={44} sx={{ mb: 3 }} />
      <Box sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <Skeleton variant="rectangular" height={40} width="100%" />
        </Box>
        <Stack>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 2,
                py: 1.5,
                borderBottom: i < 7 ? "1px solid rgba(0,0,0,0.06)" : "none",
              }}
            >
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="40%" height={20} />
                <Skeleton variant="text" width="60%" height={16} />
              </Box>
              <Skeleton variant="text" width={80} height={20} />
            </Box>
          ))}
        </Stack>
      </Box>
    </Container>
  );
}
