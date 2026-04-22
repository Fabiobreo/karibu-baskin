export interface SessionRestrictions {
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
}

export function hasRestrictions(r: SessionRestrictions): boolean {
  return r.allowedRoles.length > 0 || r.restrictTeamId !== null;
}

/**
 * True se il ruolo sportivo è esente dalla restrizione di squadra.
 * Usato sia server-side che client-side.
 */
export function isRoleOpenForAll(restrictions: SessionRestrictions, sportRole: number): boolean {
  return restrictions.openRoles.includes(sportRole);
}

export interface RestrictionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Controlla se un utente può iscriversi in base alle restrizioni della sessione.
 *
 * @param restrictions       - restrizioni della sessione
 * @param appRole            - ruolo applicativo dell'utente (null = anonimo)
 * @param sportRole          - ruolo sportivo usato per l'iscrizione
 * @param isInRestrictedTeam - true se l'utente/figlio è membro della squadra ristretta
 * @param registeredAsCoach  - true se il coach si iscrive come allenatore (non atleta)
 */
export function checkRegistrationAllowed(
  restrictions: SessionRestrictions,
  appRole: string | null,
  sportRole: number,
  isInRestrictedTeam: boolean,
  registeredAsCoach = false,
): RestrictionCheckResult {
  // ADMIN sempre ammesso
  if (appRole === "ADMIN") return { allowed: true };

  // Coach che si iscrive come allenatore: sempre ammesso senza restrizioni
  if (registeredAsCoach) return { allowed: true };

  // Ospite sempre ammesso
  if (appRole === "GUEST") return { allowed: true };

  // Nessuna restrizione → tutti ammessi
  if (!hasRestrictions(restrictions)) return { allowed: true };

  // Controllo ruoli ammessi
  if (restrictions.allowedRoles.length > 0 && !restrictions.allowedRoles.includes(sportRole)) {
    return {
      allowed: false,
      reason: `Questo allenamento è riservato ai ruoli ${restrictions.allowedRoles.join(", ")}`,
    };
  }

  // Controllo restrizione squadra
  if (restrictions.restrictTeamId !== null) {
    // Ruoli aperti bypassano la restrizione di squadra
    if (restrictions.openRoles.includes(sportRole)) return { allowed: true };
    if (!isInRestrictedTeam) {
      return {
        allowed: false,
        reason: "Questo allenamento è riservato ai membri di una squadra specifica",
      };
    }
  }

  return { allowed: true };
}
