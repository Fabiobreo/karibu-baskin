import PlaybookListPage from "@/components/board/PlaybookListPage";
import { buildMetadata } from "@/lib/seo";

// Gli esercizi resi pubblici li vede chiunque, anche Google (UX-72).
export const metadata = buildMetadata({
  title: "Esercizi di Baskin",
  description:
    "Esercizi di Baskin del Karibu Baskin di Montecchio Maggiore, animati passo dopo passo: da guardare e rifare in palestra.",
  path: "/playbook/esercizi",
});

export default function PlaybookExercisesPage() {
  return <PlaybookListPage category="exercises" />;
}
