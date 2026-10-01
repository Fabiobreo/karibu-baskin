import { Container } from "@mui/material";
import { heroOverlapSx } from "@/lib/heroStyles";
import NextActionCard from "@/components/common/NextActionCard";
import { loadNextAction } from "@/lib/nextAction";

interface NextActionSectionProps {
  userId: string;
  appRole: string;
  /** In home: dentro il contenitore della pagina, sopra il bordo basso dell'hero (UX-33). */
  home?: boolean;
}

/**
 * Carica la prossima azione del tesserato (UX-16). Server Component con le sue
 * query: la pagina lo avvolge in `<Suspense>` e non lo aspetta per il resto.
 */
export default async function NextActionSection({
  userId,
  appRole,
  home = false,
}: NextActionSectionProps) {
  const action = await loadNextAction(userId, appRole);
  if (!home) return <NextActionCard action={action} />;
  return (
    <Container maxWidth="lg" sx={heroOverlapSx}>
      <NextActionCard action={action} />
    </Container>
  );
}
