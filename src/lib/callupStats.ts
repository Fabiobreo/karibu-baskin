// Calcolo statistiche per la selezione convocati di una partita.
// Per ogni candidato (User o Child membro della rosa) calcola:
// - presenze allenamenti nelle ultime 2 settimane (su sessioni eligibili per ruolo/squadra)
// - assenze (= eligibile e non presente / non iscritto)
// - eligibili totali in finestra
// - n. convocazioni stagione corrente (escluso il match corrente)
// - giorni dall'ultima convocazione (precedente al match corrente)

export type CandidateKind = "user" | "child";

export interface CandidateInput {
  kind: CandidateKind;
  id: string; // userId o childId
  name: string;
  image: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
  isCaptain: boolean;
  teamIds: string[]; // squadre di cui fa parte (per gestire restrictTeamId)
}

export interface SessionEligibilityInput {
  id: string;
  date: Date;
  managedAt: Date | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
}

export interface RegistrationLookup {
  sessionId: string;
  userId: string | null;
  childId: string | null;
  attended: boolean | null;
}

export interface CallupLookup {
  matchId: string;
  matchDate: Date;
  userId: string | null;
  childId: string | null;
}

export interface CandidateStats {
  candidate: CandidateInput;
  presences: number;
  absences: number;
  eligibleSessions: number;
  seasonCallups: number;
  daysSinceLastCallup: number | null; // null = mai convocato prima
}

export function isSessionEligible(
  session: SessionEligibilityInput,
  candidate: CandidateInput
): boolean {
  if (session.allowedRoles.length > 0) {
    if (candidate.sportRole == null) return false;
    if (!session.allowedRoles.includes(candidate.sportRole)) return false;
  }
  if (session.restrictTeamId != null) {
    const isMember = candidate.teamIds.includes(session.restrictTeamId);
    const isOpenRole =
      candidate.sportRole != null && session.openRoles.includes(candidate.sportRole);
    if (!isMember && !isOpenRole) return false;
  }
  return true;
}

interface ComputeArgs {
  candidates: CandidateInput[];
  // Sessioni passate + gestite nella finestra di osservazione
  windowSessions: SessionEligibilityInput[];
  // Registrazioni dei candidati su quelle sessioni
  registrations: RegistrationLookup[];
  // Convocazioni del candidato in stagione (matchDate < referenceDate, escluso match corrente)
  callups: CallupLookup[];
  // Riferimento per "giorni da ultima convocazione" (di solito = oggi, oppure data del match in editing)
  referenceDate: Date;
}

export function computeCandidateStats({
  candidates,
  windowSessions,
  registrations,
  callups,
  referenceDate,
}: ComputeArgs): CandidateStats[] {
  // Indice registrazioni: chiave = `${sessionId}|${userId|childId}`
  const regBySessionAndCandidate = new Map<string, RegistrationLookup>();
  for (const r of registrations) {
    const candId = r.userId ?? r.childId ?? "";
    if (!candId) continue;
    regBySessionAndCandidate.set(`${r.sessionId}|${candId}`, r);
  }

  // Indice convocazioni per candidato
  const callupsByCandidate = new Map<string, CallupLookup[]>();
  for (const c of callups) {
    const candId = c.userId ?? c.childId ?? "";
    if (!candId) continue;
    const arr = callupsByCandidate.get(candId) ?? [];
    arr.push(c);
    callupsByCandidate.set(candId, arr);
  }

  return candidates.map((cand) => {
    let presences = 0;
    let absences = 0;
    let eligibleSessions = 0;

    for (const s of windowSessions) {
      if (!isSessionEligible(s, cand)) continue;
      eligibleSessions++;
      const reg = regBySessionAndCandidate.get(`${s.id}|${cand.id}`);
      if (reg?.attended === true) presences++;
      else absences++; // include: iscritto+assente, iscritto+null, mai iscritto
    }

    const myCallups = callupsByCandidate.get(cand.id) ?? [];
    const seasonCallups = myCallups.length;

    let daysSinceLastCallup: number | null = null;
    if (myCallups.length > 0) {
      const latest = myCallups.reduce((acc, c) =>
        c.matchDate > acc.matchDate ? c : acc
      ).matchDate;
      const diffMs = referenceDate.getTime() - latest.getTime();
      daysSinceLastCallup = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      candidate: cand,
      presences,
      absences,
      eligibleSessions,
      seasonCallups,
      daysSinceLastCallup,
    };
  });
}
