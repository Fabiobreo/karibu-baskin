import { NextRequest, NextResponse } from "next/server";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { syncInstagram } from "@/lib/gallery/instagram";

// Trigger manuale del sync Instagram dal pannello admin.
export async function POST(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  // Il sync è pesante: limito a poche esecuzioni manuali al minuto.
  const rl = checkRateLimit(getClientIp(req), "gallery-sync", 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  try {
    const result = await syncInstagram();
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    console.error("[gallery/sync] errore:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sync Instagram" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
