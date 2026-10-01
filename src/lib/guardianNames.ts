/**
 * "Anna Rossi e Marco Rossi": etichetta "Figlio di …" per uno o più genitori.
 * Modulo senza Prisma, usabile anche nei componenti client (vedi @/lib/guardians).
 */
export function guardianNames(guardians: { name: string | null; email: string }[]): string {
  return joinNames(guardians.map((g) => g.name?.trim() || g.email));
}

/**
 * "Figlio di Anna e Marco" / "Figlia di …": sottotitolo delle liste dello staff.
 * Senza genere resta "Figlio di", come nel resto dell'admin.
 */
export function childOfLabel(gender: string | null | undefined, parents: string[]): string {
  return `${gender === "FEMALE" ? "Figlia" : "Figlio"} di ${joinNames(parents)}`;
}

/** "Anna, Marco e Luca": elenco di nomi in italiano. Vale anche per "Genitore di …". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "?";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}
