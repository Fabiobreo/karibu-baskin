/**
 * Chi vede "Le mie disponibilità" (bottone del profilo, voce del menu
 * dell'header): chi può avere partite a cui rispondere (UX-46).
 *
 * Atleti, genitori e staff che gioca (lo stesso pubblico della card "prossima
 * cosa da fare", `showsNextAction` in `@/lib/nextAction`), più chiunque abbia
 * figli collegati. L'ospite solo se ha figli collegati: lui non è in nessuna
 * squadra, ma i figli sì, e il cron `match-availability-reminder` lo manda su
 * quella pagina. Senza figli la pagina gli sarebbe sempre vuota.
 * Puro, senza Prisma: lo usano la sessione e le pagine.
 */
export function showsAvailabilities(
  appRole: string | null | undefined,
  sportRole: number | null | undefined,
  childCount: number
): boolean {
  if (!appRole) return false;
  if (appRole === "GUEST") return childCount > 0;
  if (appRole === "ATHLETE" || appRole === "PARENT") return true;
  return sportRole != null || childCount > 0;
}
