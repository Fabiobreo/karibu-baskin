"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { shouldScrollToTop } from "@/lib/scrollReset";

/**
 * Riporta in cima la pagina nuova quando si apre un link (vedi
 * `shouldScrollToTop`: sulle pagine con `loading.tsx` Next non lo faceva).
 */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const poppedPath = useRef<string | null>(null);

  useEffect(() => {
    // Al `popstate` l'indirizzo è già quello nuovo.
    const onPopState = () => {
      poppedPath.current = window.location.pathname;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const scroll = shouldScrollToTop({
      previousPath: previous.current,
      path: pathname,
      poppedPath: poppedPath.current,
      hash: window.location.hash,
    });
    // Ogni cambio di pagina consuma il segno: non resta per il clic dopo.
    if (previous.current !== pathname) poppedPath.current = null;
    previous.current = pathname;
    if (scroll) window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
