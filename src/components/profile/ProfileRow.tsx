import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Riga etichetta + valore delle sezioni del profilo, da mettere dentro un
 * `<dl>`. Su telefono etichetta a sinistra e valore a destra; da `sm` il valore
 * sta accanto all'etichetta, in una colonna fissa (UX-42): su una card larga
 * 880 px i due non devono finire ai bordi opposti.
 */
export default function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr auto", sm: "160px 1fr" },
        alignItems: "center",
        columnGap: 2,
      }}
    >
      <Typography component="dt" variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box component="dd" sx={{ m: 0, minWidth: 0, justifySelf: { xs: "end", sm: "start" } }}>
        {children}
      </Box>
    </Box>
  );
}
