import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import TeamDisplay from "./TeamDisplay";
import { teamsTwo, teamsThree, teamsUnbalanced } from "@/stories/fixtures/teams";
import { athletes } from "@/stories/fixtures/athletes";

const meta: Meta<typeof TeamDisplay> = {
  title: "Componenti/TeamDisplay",
  component: TeamDisplay,
  parameters: {
    layout: "padded",
  },
  args: {
    sessionId: "session-demo",
    isStaff: false,
    editMode: false,
    teamsLoading: false,
    teams: null,
    onTeamsGenerated: fn(),
    onExitEditMode: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TeamDisplay>;

// ── Empty states ──────────────────────────────────────────────────────────────

export const NonGenerateUtente: Story = {
  name: "Non generate (utente)",
  args: {
    teams: null,
    isStaff: false,
  },
};

export const NonGenerateStaff: Story = {
  name: "Non generate (staff)",
  args: {
    teams: null,
    isStaff: true,
  },
};

export const Caricamento: Story = {
  name: "In caricamento",
  args: {
    teams: null,
    teamsLoading: true,
  },
};

// ── Squadre generate ──────────────────────────────────────────────────────────

export const DueSquadreDesktop: Story = {
  name: "2 squadre — desktop",
  args: {
    teams: teamsTwo,
  },
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
};

export const DueSquadreMobile: Story = {
  name: "2 squadre — mobile",
  args: {
    teams: teamsTwo,
  },
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
};

export const TreSquadre: Story = {
  name: "3 squadre (Arancioni/Neri/Bianchi)",
  args: {
    teams: teamsThree,
  },
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
};

export const SquadreSquilibrate: Story = {
  name: "2 squadre squilibrate",
  args: {
    teams: teamsUnbalanced,
  },
};

// ── Con utente identificato ───────────────────────────────────────────────────

export const UtenteInSquadra: Story = {
  name: "Utente nella sua squadra (banner)",
  args: {
    teams: teamsTwo,
    currentUserTeamIndex: 1,
    registrationIds: [athletes.centrale2.id, athletes.ala2.id],
  },
};

// ── Staff edit mode ───────────────────────────────────────────────────────────

export const ModalitaModifica: Story = {
  name: "Modalità modifica (staff)",
  args: {
    teams: teamsTwo,
    isStaff: true,
    editMode: true,
  },
};
