import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box, Container } from "@mui/material";
import GuestOnboardingCard from "./GuestOnboardingCard";
import HeroSection from "./HeroSection";
import { heroOverlapSx } from "@/lib/heroStyles";
import { computeOnboardingSteps, type GuestOnboarding } from "@/lib/guestOnboarding";

const nextSession = {
  id: "demo",
  href: "/allenamento/demo",
  date: new Date("2026-09-18T18:30:00Z"),
};

function data(input: {
  hasRole: boolean;
  hasRegistration: boolean;
  extra?: Partial<GuestOnboarding>;
}): GuestOnboarding {
  const steps = computeOnboardingSteps(input);
  return {
    steps,
    doneCount: steps.filter((s) => s.status === "done").length,
    role: input.hasRole ? { role: 3, variant: null } : null,
    roleConfirmed: false,
    registeredSession: null,
    nextSession,
    ...input.extra,
  };
}

const meta: Meta<typeof GuestOnboardingCard> = {
  title: "Onboarding/GuestOnboardingCard",
  component: GuestOnboardingCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Story />
      </Box>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GuestOnboardingCard>;

export const AppenaIscritto: Story = {
  args: { data: data({ hasRole: false, hasRegistration: false }) },
};

export const RuoloScoperto: Story = {
  args: { data: data({ hasRole: true, hasRegistration: false }) },
};

export const IscrittoAlPrimoAllenamento: Story = {
  args: {
    data: data({
      hasRole: true,
      hasRegistration: true,
      extra: { registeredSession: nextSession },
    }),
  },
};

export const NessunAllenamentoAperto: Story = {
  args: {
    data: data({ hasRole: false, hasRegistration: false, extra: { nextSession: null } }),
  },
};

/** Come appare in home: hero con il saluto e card sopra il suo bordo basso (UX-33). */
export const HomeGuest: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <Story />],
  render: () => (
    <Box sx={{ bgcolor: "background.default", pb: 6 }}>
      <HeroSection greeting="Ciao Fabio, ti diamo il benvenuto!" />
      <Container maxWidth="lg" sx={heroOverlapSx}>
        <GuestOnboardingCard data={data({ hasRole: false, hasRegistration: false })} />
      </Container>
    </Box>
  ),
};
