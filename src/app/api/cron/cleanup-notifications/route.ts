import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Vercel Cron — eseguito ogni domenica alle 03:00 UTC
// Elimina notifiche più vecchie di 90 giorni già lette da tutti
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Elimina notifiche vecchie che hanno almeno una lettura
  // (globali lette da almeno qualcuno; targettate lette dall'utente target)
  const { count } = await prisma.appNotification.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      reads: { some: {} }, // ha almeno una riga in AppNotificationRead
    },
  });

  // Elimina anche link-request scadute da più di 90 giorni
  const { count: expiredLinks } = await prisma.linkRequest.deleteMany({
    where: {
      expiresAt: { lt: cutoff },
      status: "PENDING",
    },
  });

  return NextResponse.json({ deletedNotifications: count, deletedExpiredLinks: expiredLinks });
}
