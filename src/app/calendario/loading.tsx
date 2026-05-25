import { Container, Skeleton, Box } from "@mui/material";

export default function CalendarioLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Skeleton variant="text" width={160} height={40} sx={{ mb: 3 }} />
      {/* Calendar grid placeholder */}
      <Box
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}
      >
        {/* Month header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="text" width={140} height={32} />
          <Skeleton variant="circular" width={36} height={36} />
        </Box>
        {/* Day rows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <Box
            key={row}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: row < 4 ? "1px solid" : undefined,
              borderBottomColor: "divider",
            }}
          >
            {Array.from({ length: 7 }).map((_, col) => (
              <Box
                key={col}
                sx={{
                  p: 1,
                  minHeight: 80,
                  borderRight: col < 6 ? "1px solid" : undefined,
                  borderRightColor: "divider",
                }}
              >
                <Skeleton variant="text" width={24} height={20} />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Container>
  );
}
