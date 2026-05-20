import type { CurrentUser } from "@/hooks/useRegistrationForm";
import { membershipAranci2025, membershipNeri2025 } from "./memberships";

export const userAnonymous = null;

export const userAthleteNoRole: CurrentUser = {
  id: "u-1",
  name: "Marco Rossi",
  appRole: "ATHLETE",
  sportRole: null,
  sportRoleVariant: null,
  sportRoleSuggested: null,
  sportRoleSuggestedVariant: null,
  linkedChildId: null,
  teamMemberships: [],
};

export const userAthleteWithRole: CurrentUser = {
  ...userAthleteNoRole,
  sportRole: 3,
  sportRoleVariant: null,
};

export const userAthleteWithVariant: CurrentUser = {
  ...userAthleteWithRole,
  sportRoleVariant: "T",
};

export const userAthleteWithTeamBadge: CurrentUser = {
  ...userAthleteWithRole,
  teamMemberships: [membershipAranci2025],
};

export const userAthleteHighRole: CurrentUser = {
  ...userAthleteNoRole,
  id: "u-5",
  name: "Elena Marino",
  sportRole: 5,
};

export const userParent: CurrentUser = {
  id: "u-2",
  name: "Anna Verdi",
  appRole: "PARENT",
  sportRole: null,
  sportRoleVariant: null,
  sportRoleSuggested: null,
  sportRoleSuggestedVariant: null,
  linkedChildId: null,
  teamMemberships: [],
};

export const userCoach: CurrentUser = {
  id: "u-3",
  name: "Alberto Costa",
  appRole: "COACH",
  sportRole: 3,
  sportRoleVariant: null,
  sportRoleSuggested: null,
  sportRoleSuggestedVariant: null,
  linkedChildId: null,
  teamMemberships: [membershipNeri2025],
};

export const userGuest: CurrentUser = {
  id: "u-4",
  name: "Ospite Prova",
  appRole: "GUEST",
  sportRole: null,
  sportRoleVariant: null,
  sportRoleSuggested: null,
  sportRoleSuggestedVariant: null,
  linkedChildId: null,
  teamMemberships: [],
};
