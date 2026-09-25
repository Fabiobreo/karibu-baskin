import { Container } from "@mui/material";
import NextActionCard from "@/components/common/NextActionCard";
import { loadNextAction } from "@/lib/nextAction";

interface NextActionSectionProps {
  userId: string;
  appRole: string;
  overlapHero?: boolean;
}

/**
 * Carica la prossima azione del tesserato (UX-16). Server Component con le sue
 * query: la pagina lo avvolge in `<Suspense>` e non lo aspetta per il resto.
 */
export default async function NextActionSection({
  userId,
  appRole,
  overlapHero = false,
}: NextActionSectionProps) {
  const action = await loadNextAction(userId, appRole);
  if (!overlapHero) return <NextActionCard action={action} />;
  return (
    <Container maxWidth="md">
      <NextActionCard action={action} overlapHero />
    </Container>
  );
}
