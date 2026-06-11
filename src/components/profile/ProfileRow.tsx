import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/** Riga etichetta + valore usata nelle sezioni del profilo. */
export default function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}
