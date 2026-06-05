import type { SessionWithCount } from "@/components/training/SessionCard";
import { teamsTwo } from "./teams";

const NOW = Date.now();

const baseSession: SessionWithCount = {
  id: "s-1",
  title: "Allenamento Lunedì",
  date: new Date("2026-05-25T19:00:00"),
  endTime: new Date("2026-05-25T21:00:00"),
  dateSlug: "2026-05-25-allenamento-lunedi",
  teams: null,
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
  restrictTeam: null,
  _count: { registrations: 8 },
};

export const sessionFuture: SessionWithCount = {
  ...baseSession,
  id: "s-1",
};

export const sessionToday: SessionWithCount = {
  ...baseSession,
  id: "s-2",
  title: "Allenamento Oggi",
  date: new Date(NOW + 2 * 60 * 60 * 1000),
  endTime: new Date(NOW + 4 * 60 * 60 * 1000),
};

export const sessionLive: SessionWithCount = {
  ...baseSession,
  id: "s-3",
  title: "Allenamento in Corso",
  date: new Date(NOW - 30 * 60 * 1000),
  endTime: new Date(NOW + 90 * 60 * 1000),
};

export const sessionPast: SessionWithCount = {
  ...baseSession,
  id: "s-4",
  title: "Allenamento 10 Aprile",
  date: new Date("2026-04-10T19:00:00"),
  endTime: new Date("2026-04-10T21:00:00"),
  teams: teamsTwo,
  _count: { registrations: 10 },
};

export const sessionWithTeams: SessionWithCount = {
  ...baseSession,
  id: "s-5",
  title: "Allenamento con Squadre",
  teams: teamsTwo,
  _count: { registrations: 10 },
};

export const sessionRestricted: SessionWithCount = {
  ...baseSession,
  id: "s-6",
  title: "Allenamento Solo Aranci",
  allowedRoles: [1, 2],
  restrictTeamId: "team-aranci",
  openRoles: [1],
  restrictTeam: { id: "team-aranci", name: "Aranci", color: "#FF6F00" },
};

export const sessionFull: SessionWithCount = {
  ...baseSession,
  id: "s-7",
  title: "Allenamento Pieno",
  _count: { registrations: 24 },
};

export const sessionNoEnd: SessionWithCount = {
  ...baseSession,
  id: "s-8",
  title: "Allenamento senza orario fine",
  endTime: null,
};
