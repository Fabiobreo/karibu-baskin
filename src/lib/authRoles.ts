import type { AppRole } from "@prisma/client";

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  GUEST: 0,
  ATHLETE: 1,
  PARENT: 2,
  COACH: 3,
  ADMIN: 4,
};

export const ROLE_LABELS_IT: Record<AppRole, string> = {
  GUEST: "Ospite",
  ATHLETE: "Atleta",
  PARENT: "Genitore",
  COACH: "Allenatore",
  ADMIN: "Admin",
};

export function hasRole(userRole: AppRole, required: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

export function canManageSessions(role: AppRole): boolean {
  return hasRole(role, "COACH");
}

export function canRegister(role: AppRole): boolean {
  return hasRole(role, "GUEST");
}
