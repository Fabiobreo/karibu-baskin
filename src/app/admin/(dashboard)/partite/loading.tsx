import { Container, Skeleton, Stack, Box } from "@mui/material";

export default function Loading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="text" width={220} height={44} sx={{ mb: 3 }} />
      <Stack spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box
            key={i}
            sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width={90} height={24} />
            </Box>
            <Skeleton variant="text" width="55%" height={20} />
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
