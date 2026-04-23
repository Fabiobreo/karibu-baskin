import { Container, Skeleton, Stack, Box } from "@mui/material";

export default function NotificheLoading() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Skeleton variant="text" width={160} height={40} sx={{ mb: 3 }} />
      <Stack spacing={1.5}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, p: 2, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 2 }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="80%" height={22} />
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="text" width="30%" height={16} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
