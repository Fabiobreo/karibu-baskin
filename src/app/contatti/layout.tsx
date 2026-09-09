import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// La pagina è un Client Component e non può esportare metadata: stanno qui.
export const metadata: Metadata = buildMetadata({
  title: "Contatti",
  description:
    "Dove ci alleniamo, come raggiungerci e come scriverci: i contatti del Karibu Baskin di Montecchio Maggiore.",
  path: "/contatti",
});

export default function ContattiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
