import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import TeamDisplay from "./TeamDisplay";
import { teamsTwo, teamsThree, teamsUnbalanced } from "@/stories/fixtures/teams";
import { athletes } from "@/stories/fixtures/athletes";
import type { TeamLevels } from "./TeamBalanceBar";

// Livelli finti per lo staff (UX-54): gli Arancioni un po' più forti.
const demoLevels: TeamLevels = {
  "ath-1": { mu: 29, sigma: 4, band: "alta" },
  "ath-2": { mu: 24, sigma: 4, band: "media" },
  "ath-3": { mu: 27, sigma: 5, band: "alta" },
  "ath-4": { mu: 21, sigma: 5, band: "bassa" },
  "ath-5": { mu: 26, sigma: 4, band: "media" },
  "ath-6": { mu: 25, sigma: 4, band: "media" },
  "ath-7": { mu: 28, sigma: 4, band: "alta" },
  "ath-8": { mu: 22, sigma: 5, band: "bassa" },
  "ath-9": { mu: 27, sigma: 4, band: "media" },
};
const lateAthlete = { id: "ath-late", name: "Anna Pozza", role: 3 };
const allAthletes = [...teamsTwo.teamA, ...teamsTwo.teamB, lateAthlete];

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
    viewerMarks: { [athletes.centrale2.id]: "self" },
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

// ── Staff: ritardatari ed equilibrio (UX-54) ──────────────────────────────────

export const StaffRitardatarioEquilibrio: Story = {
  name: "Staff: ritardatario ed equilibrio",
  args: {
    teams: teamsTwo,
    isStaff: true,
    levels: demoLevels,
    athletes: allAthletes,
    registrationIds: allAthletes.map((a) => a.id),
  },
};

export const StaffModificaConEquilibrio: Story = {
  name: "Staff: modifica con equilibrio",
  args: {
    teams: teamsTwo,
    isStaff: true,
    editMode: true,
    levels: demoLevels,
    athletes: allAthletes,
    registrationIds: allAthletes.map((a) => a.id),
  },
};
