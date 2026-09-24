"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Vero per le pagine del pannello staff (`/admin` e sottopagine). */
export function isAdminPath(pathname: string | null): boolean {
  return pathname === "/admin" || !!pathname?.startsWith("/admin/");
}

/**
 * Nasconde il contenuto solo nel pannello admin (UX-06): li' nastro sponsor e
 * footer pubblico sono rumore. Ovunque altrove resta tutto com'e': il nastro
 * sponsor in ogni pagina pubblica e' la visibilita' promessa agli sponsor.
 */
export default function HideInAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isAdminPath(pathname)) return null;
  return <>{children}</>;
}
