import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";

// Vercel Cron — ogni giorno alle 08:00 UTC
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

  const now = new Date();
  const todayMonth = now.getMonth() + 1; // 1-12
  const todayDay = now.getDate();

  // Recupera tutti gli utenti con birthDate impostata (non guest)
  const users = await prisma.user.findMany({
    where: { birthDate: { not: null }, appRole: { not: "GUEST" } },
    select: { id: true, name: true, birthDate: true },
  });

  const celebrants = users.filter((u) => {
    const d = new Date(u.birthDate!);
    return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
  });

  if (celebrants.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const names = celebrants.map((u) => u.name ?? "Un compagno").join(", ");
  const title =
    celebrants.length === 1
      ? `🎂 Buon compleanno, ${celebrants[0].name ?? "compagno"}!`
      : `🎂 Oggi è il compleanno di ${celebrants.length} compagni!`;
  const body =
    celebrants.length === 1
      ? `Oggi ${celebrants[0].name ?? "un compagno di squadra"} compie gli anni. Fai gli auguri!`
      : `Oggi festeggiano: ${names}. Fai gli auguri!`;

  // Nome e compleanno sono dati nominativi dei tesserati, spesso di minori: gli
  // auguri vanno solo ai tesserati. Non a tutti i dispositivi iscritti alle
  // push (ci sono anche iscrizioni anonime) né agli account ancora GUEST.
  const members = await prisma.user.findMany({
    where: { appRole: { in: ["ATHLETE", "PARENT", "COACH", "ADMIN"] } },
    select: { id: true },
  });
  const memberIds = members.map((m) => m.id);

  sendPushToUsers(memberIds, { title, body, url: "/" }).catch(console.error);

  createTargetedAppNotifications(memberIds, { type: "BIRTHDAY", title, body, url: "/" }).catch(
    console.error
  );

  return NextResponse.json({ sent: celebrants.length, names });
}
