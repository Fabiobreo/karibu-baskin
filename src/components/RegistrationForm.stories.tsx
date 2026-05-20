import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import RegistrationForm from "./RegistrationForm";
import {
  userAnonymous,
  userAthleteNoRole,
  userAthleteWithRole,
  userAthleteWithTeamBadge,
  userAthleteHighRole,
  userParent,
  userCoach,
} from "@/stories/fixtures/users";
import { childOne, childTwo, childNoRole } from "@/stories/fixtures/children";
import { noRestrictions, roleRestriction, teamRestriction } from "@/stories/fixtures/restrictions";

const meta: Meta<typeof RegistrationForm> = {
  title: "Componenti/RegistrationForm",
  component: RegistrationForm,
  parameters: {
    layout: "padded",
  },
  args: {
    sessionId: "session-demo",
    onRegistered: fn(),
    onOptimisticAdd: fn(),
    onSubmitError: fn(),
    registeredNames: ["Utente Esistente"],
    registeredUserIds: ["other-user"],
    registeredChildIds: [],
    currentUser: userAnonymous,
    parentChildren: [],
    restrictions: noRestrictions,
  },
};

export default meta;
type Story = StoryObj<typeof RegistrationForm>;

// ── Anonimo / non autenticato ─────────────────────────────────────────────────

export const Anonimo: Story = {
  name: "Anonimo (non autenticato)",
  args: {
    currentUser: userAnonymous,
  },
};

// ── Atleta ────────────────────────────────────────────────────────────────────

export const AtletaSenzaRuolo: Story = {
  name: "Atleta — senza ruolo (mostra questionario)",
  args: {
    currentUser: userAthleteNoRole,
  },
};

export const AtletaConRuolo: Story = {
  name: "Atleta — con ruolo confermato",
  args: {
    currentUser: userAthleteWithRole,
  },
};

export const AtletaConBadgeSquadra: Story = {
  name: "Atleta — con badge squadra Aranci",
  args: {
    currentUser: userAthleteWithTeamBadge,
  },
};

export const AtletaGiaIscritto: Story = {
  name: "Atleta — già iscritto",
  args: {
    currentUser: userAthleteWithRole,
    registeredUserIds: [userAthleteWithRole.id],
  },
};

// ── Genitore ─────────────────────────────────────────────────────────────────

export const GenitoreConFigli: Story = {
  name: "Genitore — con 2 figli",
  args: {
    currentUser: userParent,
    parentChildren: [childOne, childTwo],
  },
};

export const GenitoreConFiglioSenzaRuolo: Story = {
  name: "Genitore — figlio senza ruolo",
  args: {
    currentUser: userParent,
    parentChildren: [childNoRole],
  },
};

export const GenitoreFilioGiaIscritto: Story = {
  name: "Genitore — un figlio già iscritto",
  args: {
    currentUser: userParent,
    parentChildren: [childOne, childTwo],
    registeredChildIds: [childOne.id],
  },
};

export const GenitoreGiaIscrittoConFiglio: Story = {
  name: "Genitore — tutti già iscritti",
  args: {
    currentUser: userParent,
    parentChildren: [childOne],
    registeredUserIds: [userParent.id],
    registeredChildIds: [childOne.id],
  },
};

// ── Coach ─────────────────────────────────────────────────────────────────────

export const Coach: Story = {
  name: "Coach — toggle atleta/allenatore",
  args: {
    currentUser: userCoach,
  },
};

// ── Restrizioni ───────────────────────────────────────────────────────────────

export const RestrizioneRuoloBloccato: Story = {
  name: "Restrizione — ruolo non ammesso (lock)",
  args: {
    currentUser: userAthleteHighRole,
    restrictions: roleRestriction,
  },
};

export const RestrizioneSquadra: Story = {
  name: "Restrizione — solo squadra Aranci",
  args: {
    currentUser: userAthleteWithRole,
    restrictions: teamRestriction,
  },
};

export const RestrizioneRuoloInfoBanner: Story = {
  name: "Restrizione — banner informativo (ruolo ammesso)",
  args: {
    currentUser: userAthleteWithTeamBadge,
    restrictions: teamRestriction,
  },
};

// ── Loading state ─────────────────────────────────────────────────────────────

export const Caricamento: Story = {
  name: "Caricamento (currentUser undefined)",
  args: {
    currentUser: undefined,
  },
};
