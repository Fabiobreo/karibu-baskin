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
    // In produzione potresti loggare su Sentry o simili
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Qualcosa è andato storto"
      description="Si è verificato un errore imprevisto. Puoi riprovare oppure tornare alla pagina principale."
      showReset
      onReset={reset}
    />
  );
}
