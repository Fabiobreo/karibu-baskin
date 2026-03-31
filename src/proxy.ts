import { NextRequest, NextResponse } from "next/server";

// Tutta la protezione delle route è gestita direttamente nei layout e nelle
// API route (Node.js runtime), dove auth() funziona con sessioni database.
// Il middleware Edge Runtime non può usare Prisma, quindi non fa auth qui.

export async function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
