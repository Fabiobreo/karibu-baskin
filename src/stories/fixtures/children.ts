import type { ChildInfo } from "@/hooks/useRegistrationForm";
import { membershipNeri2025 } from "./memberships";

export const childOne: ChildInfo = {
  id: "c-1",
  name: "Sofia Verdi",
  sportRole: 2,
  sportRoleVariant: null,
  userId: null,
  teamMemberships: [],
};

export const childTwo: ChildInfo = {
  id: "c-2",
  name: "Luca Verdi",
  sportRole: 4,
  sportRoleVariant: null,
  userId: "linked-u-99",
  teamMemberships: [membershipNeri2025],
};

export const childNoRole: ChildInfo = {
  id: "c-3",
  name: "Gianni Verdi",
  sportRole: null,
  sportRoleVariant: null,
  userId: null,
  teamMemberships: [],
};
