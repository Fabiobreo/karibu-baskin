import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { syncInstagram } from "@/lib/instagram";

// Vercel Cron — sincronizza il feed Instagram nella Gallery.
// Schedulato in vercel.json (ogni 6 ore).
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret ?? ""}`;
  const valid =
    !!cronSecret &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!valid || !isVercelCron) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const result = await syncInstagram();
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    console.error("[cron/instagram-sync] errore:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sync Instagram" },
      { status: 500 }
    );
  }
}

// Il sync scarica e ricomprime immagini: può richiedere più del default.
export const maxDuration = 60;
