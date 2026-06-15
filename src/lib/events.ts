// Helper temporali per gli eventi. Isolano la lettura dell'orologio (`Date.now`)
// fuori dal render dei Server Component, dove la regola react-hooks/purity la
// vieterebbe.

type TimedEvent = { date: Date; endDate: Date | null };

/** Un evento è "passato" se la sua fine (o inizio, se single-day) è trascorsa. */
export function isEventPast(e: TimedEvent): boolean {
  return (e.endDate ?? e.date).getTime() <= Date.now();
}

/** Divide gli eventi in prossimi (asc) e passati (desc) rispetto a ora. */
export function splitEventsByTime<T extends TimedEvent>(events: T[]): { upcoming: T[]; past: T[] } {
  const now = Date.now();
  const upcoming = events
    .filter((e) => (e.endDate ?? e.date).getTime() >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = events
    .filter((e) => (e.endDate ?? e.date).getTime() < now)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return { upcoming, past };
}
