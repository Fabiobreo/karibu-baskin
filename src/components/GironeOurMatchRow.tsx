"use client";

// Necessario perché gironi/[groupId]/page.tsx è un Server Component e non può
// usare onClick (gli event handler non funzionano in RSC — il click sarebbe silenzioso).
import { useRouter } from "next/navigation";
import { TableRow } from "@mui/material";
import type { ReactNode } from "react";

export default function GironeOurMatchRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <TableRow hover onClick={() => router.push(href)} sx={{ cursor: "pointer" }}>
      {children}
    </TableRow>
  );
}
