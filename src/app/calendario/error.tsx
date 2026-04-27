"use client";
// [CLAUDE - 09:00] Error boundary locale per il calendario — evita crash dell'intera app su errori DB
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
    console.error("[Calendario] errore:", error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Calendario non disponibile"
      description="Non è stato possibile caricare il calendario. Riprova tra qualche secondo o torna alla pagina principale."
      showReset
      onReset={reset}
    />
  );
}
