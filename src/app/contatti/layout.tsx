import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import JsonLd from "@/components/common/JsonLd";
import { organizationJsonLd } from "@/lib/structuredData";

// La pagina è un Client Component e non può esportare metadata: stanno qui.
export const metadata: Metadata = buildMetadata({
  title: "Contatti e vieni a provare",
  description:
    "Vieni a provare il baskin a Montecchio Maggiore (Vicenza): prossimi allenamenti, sede, cosa portare e come scriverci.",
  path: "/contatti",
});

export default function ContattiLayout({ children }: { children: React.ReactNode }) {
  // La pagina che Google associa alla sede ha l'indirizzo strutturato (UX-62).
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      {children}
    </>
  );
}
