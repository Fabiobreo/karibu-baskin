"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import { isAdminPath } from "@/components/layout/HideInAdmin";

/**
 * Il `<main>` del sito. Su telefono lascia in fondo lo spazio della barra in
 * basso, tranne in admin, dove la barra non c'è (UX-40).
 */
export default function MainContent({ children }: { children: ReactNode }) {
  const admin = isAdminPath(usePathname());
  return (
    // tabIndex -1: senza, lo skip link sposta solo lo scroll e il focus resta
    // sul body.
    <Box
      component="main"
      id="contenuto"
      tabIndex={-1}
      sx={{ flex: 1, pb: admin ? 0 : { xs: "60px", md: 0 }, outline: "none" }}
    >
      {children}
    </Box>
  );
}
