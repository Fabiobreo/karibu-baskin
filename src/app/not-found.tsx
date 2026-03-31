import type { Metadata } from "next";
import ErrorPage from "@/components/ErrorPage";

export const metadata: Metadata = { title: "Pagina non trovata | Karibu Baskin" };

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="Questa pagina non esiste"
      description="Il link che hai seguito non è corretto o la pagina è stata spostata. Nessun problema, torna agli allenamenti."
    />
  );
}
