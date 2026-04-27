"use client";
// [CLAUDE - 09:00] Error boundary locale per la lista allenamenti — evita crash su errori DB
import { useEffect } from "react";
import ErrorPage from "@/components/ErrorPage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Allenamenti] errore:", error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Allenamenti non disponibili"
      description="Non è stato possibile caricare la lista degli allenamenti. Riprova tra qualche secondo."
      showReset
      onReset={reset}
    />
  );
}
