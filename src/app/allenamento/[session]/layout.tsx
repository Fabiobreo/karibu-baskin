import type { Metadata } from "next";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

// La pagina è un Client Component e non può esportare metadata. Stanno qui perché
// è il link più condiviso del sito: senza, l'anteprima mostrava la homepage.
type Props = { params: Promise<{ session: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { session } = await params;
  const training = await prisma.trainingSession.findFirst({
    where: { OR: [{ dateSlug: session }, { id: session }] },
    select: { title: true, date: true, dateSlug: true, team: { select: { name: true } } },
  });

  if (!training) {
    return buildMetadata({
      title: "Allenamento non trovato",
      description: "Questo allenamento non esiste o è stato rimosso.",
      path: `/allenamento/${session}`,
      noindex: true,
    });
  }

  const when = format(new Date(training.date), "EEEE d MMMM 'alle' HH:mm", { locale: it });
  const who = training.team ? `${training.team.name} del Karibu Baskin` : "del Karibu Baskin";

  return buildMetadata({
    title: training.title,
    description: `Allenamento ${who}, ${when}. Iscriviti online e scopri chi c'è.`,
    path: `/allenamento/${training.dateSlug ?? session}`,
  });
}

export default function AllenamentoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
