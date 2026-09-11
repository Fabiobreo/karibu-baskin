import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { loadMyAvailabilityMatches } from "@/lib/matches/myAvailabilities";

// GET /api/users/me/availabilities
// Restituisce le partite future delle squadre dell'utente (User + Child),
// comprese quelle delle squadre Karibu della sua stagione, con lo stato di
// disponibilità corrente.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const items = await loadMyAvailabilityMatches(session.user.id, session.user.name ?? "Tu", {
    from: new Date(),
  });
  return NextResponse.json(items);
}
