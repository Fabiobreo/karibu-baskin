/**
 * Elenco leggibile di ruoli Baskin.
 *
 * Concatenare con `join(", ")` produceva "Aperto a tutti i 1, 5", che non è
 * italiano. `Intl.ListFormat` mette la congiunzione giusta nella lingua giusta,
 * e chi chiama sceglie singolare o plurale sul numero di elementi.
 */
export function formatRoleNumbers(roles: number[], locale: string): string {
  const sorted = [...roles].sort((a, b) => a - b).map(String);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return sorted[0];
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(sorted);
  } catch {
    // Runtime senza ListFormat per questa lingua: meglio una virgola che un errore.
    return sorted.join(", ");
  }
}
