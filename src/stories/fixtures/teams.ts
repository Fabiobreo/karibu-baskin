import type { TeamsData } from "@/components/training/TeamDisplay";
import { athletes, coaches } from "./athletes";

export const teamsTwo: TeamsData = {
  teamA: [athletes.centrale1, athletes.ala1, athletes.guardia1, athletes.pivot1, athletes.play1],
  teamB: [athletes.centrale2, athletes.ala2, athletes.guardia2, athletes.pivot2, athletes.play2],
  coaches,
  numTeams: 2,
  generated: true,
};

export const teamsThree: TeamsData = {
  teamA: [athletes.centrale1, athletes.ala1, athletes.guardia1],
  teamB: [athletes.centrale2, athletes.ala2, athletes.guardia2],
  teamC: [athletes.pivot1, athletes.pivot2, athletes.play1],
  coaches,
  numTeams: 3,
  generated: true,
};

export const teamsUnbalanced: TeamsData = {
  teamA: [
    athletes.centrale1,
    athletes.centrale2,
    athletes.ala1,
    athletes.ala2,
    athletes.guardia1,
    athletes.pivot1,
    athletes.play1,
  ],
  teamB: [athletes.guardia2, athletes.pivot2, athletes.play2],
  numTeams: 2,
  generated: true,
};
