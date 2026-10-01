import { Container } from "@mui/material";
import { heroOverlapSx } from "@/lib/heroStyles";
import GuestOnboardingCard from "@/components/common/GuestOnboardingCard";
import { loadGuestOnboarding } from "@/lib/guestOnboarding";

interface GuestOnboardingSectionProps {
  userId: string;
  /** In home: dentro il contenitore della pagina, sopra il bordo basso dell'hero (UX-33). */
  home?: boolean;
}

/**
 * Carica i dati della card "I tuoi primi passi". Server Component con le sue
 * query, così la pagina la avvolge in `<Suspense>` e non la aspetta per il resto.
 */
export default async function GuestOnboardingSection({
  userId,
  home = false,
}: GuestOnboardingSectionProps) {
  const data = await loadGuestOnboarding(userId);
  if (!home) return <GuestOnboardingCard data={data} />;
  return (
    <Container maxWidth="lg" sx={heroOverlapSx}>
      <GuestOnboardingCard data={data} />
    </Container>
  );
}
