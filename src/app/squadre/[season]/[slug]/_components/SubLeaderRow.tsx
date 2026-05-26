import { Box, Paper, Typography } from "@mui/material";
import Link from "next/link";
import type React from "react";

export default function SubLeaderRow({
  icon,
  label,
  leader,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  leader: { name: string; image: string | null; slug: string | null };
  value: number;
  suffix: string;
}) {
  const content = (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}
        >
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={700} noWrap>
          {leader.name} · {value} {suffix}
        </Typography>
      </Box>
    </Paper>
  );
  return leader.slug ? (
    <Link href={`/giocatori/${leader.slug}`} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    content
  );
}
