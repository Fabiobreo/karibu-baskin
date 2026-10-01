/**
 * Pagine d'uso (UX-39): quelle dove si sta facendo un compito (accesso,
 * profilo, notifiche, iscrizione a un allenamento). Li' il nastro degli sponsor
 * resta fermo, con tutti i loghi visibili: un contenuto che scorre accanto a un
 * modulo distrae (WCAG 2.2.2). Stessi loghi, stesso posto: cambia solo il
 * movimento.
 */
const TASK_PREFIXES = ["/login", "/profilo", "/notifiche", "/allenamento"] as const;

export function isTaskPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return TASK_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
