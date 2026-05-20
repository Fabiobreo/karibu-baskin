import type { SessionRestrictions } from "@/lib/registrationRestrictions";

export const noRestrictions: SessionRestrictions = {
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
};

export const roleRestriction: SessionRestrictions & { restrictTeamName?: string | null } = {
  allowedRoles: [1, 2, 3],
  restrictTeamId: null,
  openRoles: [],
  restrictTeamName: null,
};

export const teamRestriction: SessionRestrictions & { restrictTeamName?: string | null } = {
  allowedRoles: [],
  restrictTeamId: "team-aranci",
  openRoles: [1],
  restrictTeamName: "Aranci",
};

export const roleAndTeamRestriction: SessionRestrictions & { restrictTeamName?: string | null } = {
  allowedRoles: [2, 3, 4],
  restrictTeamId: "team-neri",
  openRoles: [],
  restrictTeamName: "Neri",
};
