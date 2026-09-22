/**
 * "Anna Rossi e Marco Rossi": etichetta "Figlio di …" per uno o più genitori.
 * Modulo senza Prisma, usabile anche nei componenti client (vedi @/lib/guardians).
 */
export function guardianNames(guardians: { name: string | null; email: string }[]): string {
  const names = guardians.map((g) => g.name?.trim() || g.email);
  if (names.length <= 1) return names[0] ?? "?";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}
