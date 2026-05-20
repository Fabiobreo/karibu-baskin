import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import SessionCard from "./SessionCard";
import {
  sessionFuture,
  sessionToday,
  sessionLive,
  sessionPast,
  sessionWithTeams,
  sessionRestricted,
  sessionFull,
  sessionNoEnd,
} from "@/stories/fixtures/sessions";

const meta: Meta<typeof SessionCard> = {
  title: "Componenti/SessionCard",
  component: SessionCard,
  parameters: {
    layout: "padded",
  },
  args: {
    isRegistered: false,
    myRegistrationId: null,
    isStaff: false,
    hero: false,
    muted: false,
    live: false,
    generating: false,
    removingTeams: false,
  },
};

export default meta;
type Story = StoryObj<typeof SessionCard>;

// ── Varianti temporali ────────────────────────────────────────────────────────

export const Futuro: Story = {
  name: "Futuro (tra N giorni)",
  args: {
    session: sessionFuture,
  },
};

export const Oggi: Story = {
  name: "Oggi",
  args: {
    session: sessionToday,
  },
};

export const InCorso: Story = {
  name: "In corso (live)",
  args: {
    session: sessionLive,
    live: true,
  },
};

export const Terminato: Story = {
  name: "Terminato",
  args: {
    session: sessionPast,
    muted: true,
  },
};

export const SenzaOrarioFine: Story = {
  name: "Senza orario di fine",
  args: {
    session: sessionNoEnd,
  },
};

// ── Varianti iscrizione ───────────────────────────────────────────────────────

export const UtenteIscritto: Story = {
  name: "Utente iscritto",
  args: {
    session: sessionFuture,
    isRegistered: true,
    myRegistrationId: "reg-1",
  },
};

// ── Varianti squadre ──────────────────────────────────────────────────────────

export const ConSquadre: Story = {
  name: "Con squadre generate",
  args: {
    session: sessionWithTeams,
  },
};

// ── Varianti restrizioni ──────────────────────────────────────────────────────

export const Ristretto: Story = {
  name: "Con restrizioni (Solo Aranci + ruoli 1-2)",
  args: {
    session: sessionRestricted,
  },
};

export const Pieno: Story = {
  name: "Pieno (molti iscritti)",
  args: {
    session: sessionFull,
  },
};

// ── Varianti staff ────────────────────────────────────────────────────────────

export const AzioniStaff: Story = {
  name: "Con azioni staff (menu kebab)",
  args: {
    session: sessionFuture,
    isStaff: true,
    onEdit: fn(),
    onDelete: fn(),
    onGenerateTeams: fn(),
  },
};

export const GenerazioneInCorso: Story = {
  name: "Generazione squadre in corso (staff)",
  args: {
    session: sessionFuture,
    isStaff: true,
    onGenerateTeams: fn(),
    generating: true,
  },
};

// ── Variante hero ─────────────────────────────────────────────────────────────

export const Hero: Story = {
  name: "Hero (card grande)",
  args: {
    session: sessionToday,
    hero: true,
  },
};
