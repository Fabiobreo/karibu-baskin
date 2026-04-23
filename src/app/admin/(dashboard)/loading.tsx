import { Container, Skeleton, Box, Stack } from "@mui/material";

export default function AdminLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="text" width={240} height={40} sx={{ mb: 3 }} />
      <Stack spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ p: 2.5, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2 }}>
            <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={20} />
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
