import type { TeamAthlete } from "@/components/training/TeamDisplay";

export const athletes: Record<string, TeamAthlete> = {
  centrale1: { id: "ath-1", name: "Marco Rossi", role: 1 },
  centrale2: { id: "ath-2", name: "Luca Bianchi", role: 1 },
  ala1: { id: "ath-3", name: "Giulia Verdi", role: 2 },
  ala2: { id: "ath-4", name: "Sara Neri", role: 2 },
  guardia1: { id: "ath-5", name: "Andrea Galli", role: 3 },
  guardia2: { id: "ath-6", name: "Paolo Conti", role: 3 },
  pivot1: { id: "ath-7", name: "Federica Russo", role: 4 },
  pivot2: { id: "ath-8", name: "Matteo Ricci", role: 4 },
  play1: { id: "ath-9", name: "Elena Marino", role: 5 },
  play2: { id: "ath-10", name: "Davide Esposito", role: 5 },
};

export const coaches = [
  { id: "coach-1", name: "Alberto Costa" },
  { id: "coach-2", name: "Roberta Lombardi" },
];
