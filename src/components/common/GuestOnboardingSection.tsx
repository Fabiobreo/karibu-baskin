import { Container } from "@mui/material";
import GuestOnboardingCard from "@/components/common/GuestOnboardingCard";
import { loadGuestOnboarding } from "@/lib/guestOnboarding";

interface GuestOnboardingSectionProps {
  userId: string;
  overlapHero?: boolean;
}

/**
 * Carica i dati della card "I tuoi primi passi". Server Component con le sue
 * query, così la pagina la avvolge in `<Suspense>` e non la aspetta per il resto.
 */
export default async function GuestOnboardingSection({
  userId,
  overlapHero = false,
}: GuestOnboardingSectionProps) {
  const data = await loadGuestOnboarding(userId);
  if (!overlapHero) return <GuestOnboardingCard data={data} />;
  return (
    <Container maxWidth="md">
      <GuestOnboardingCard data={data} overlapHero />
    </Container>
  );
}
