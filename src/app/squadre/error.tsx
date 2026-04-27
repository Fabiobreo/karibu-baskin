"use client";
// [CLAUDE - 09:00] Error boundary locale per la pagina squadre — evita crash dell'intera app su errori DB
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
    console.error("[Squadre] errore:", error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Squadre non disponibili"
      description="Non è stato possibile caricare le informazioni sulle squadre. Riprova tra qualche secondo."
      showReset
      onReset={reset}
    />
  );
}
