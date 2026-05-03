import type { AppRole, Gender } from "@prisma/client";

export const VALID_APP_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
export const VALID_GENDERS: Gender[] = ["MALE", "FEMALE"];
export const VALID_SPORT_ROLES: number[] = [1, 2, 3, 4, 5];
export const VALID_SPORT_ROLE_VARIANTS: string[] = ["S", "T", "P", "R"];
