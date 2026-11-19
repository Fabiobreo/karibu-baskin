import PlaybookListPage from "@/components/board/PlaybookListPage";
import { buildMetadata } from "@/lib/seo";

// Il nostro gioco da partita: solo per i tesserati, mai su Google (UX-72).
export const metadata = buildMetadata({
  title: "Schemi",
  description: "Gli schemi da partita del Karibu Baskin, per atleti, famiglie e staff.",
  path: "/playbook/schemi",
  noindex: true,
});

export default function PlaybookPlaysPage() {
  return <PlaybookListPage category="plays" />;
}
