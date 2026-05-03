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
    console.error("[error boundary]", { name: error.name, message: error.message, digest: error.digest });
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Qualcosa è andato storto"
      description="Si è verificato un errore imprevisto. Puoi riprovare oppure tornare alla pagina principale."
      showReset
      onReset={reset}
      digest={error.digest}
    />
  );
}
