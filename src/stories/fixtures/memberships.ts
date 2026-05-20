import type { TeamMembershipInfo } from "@/hooks/useRegistrationForm";

export const membershipAranci2025: TeamMembershipInfo = {
  teamId: "team-aranci",
  teamName: "Aranci",
  teamColor: "#FF6F00",
  teamSeason: "2025-26",
};

export const membershipNeri2025: TeamMembershipInfo = {
  teamId: "team-neri",
  teamName: "Neri",
  teamColor: "#212121",
  teamSeason: "2025-26",
};

export const membershipNeriVecchia: TeamMembershipInfo = {
  ...membershipNeri2025,
  teamSeason: "2024-25",
};
