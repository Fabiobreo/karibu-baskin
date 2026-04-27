"use client";
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
    console.error("[Allenamento] errore:", error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Allenamento non disponibile"
      description="Si è verificato un errore durante il caricamento dell'allenamento. Riprova o torna alla lista allenamenti."
      showReset
      onReset={reset}
    />
  );
}
