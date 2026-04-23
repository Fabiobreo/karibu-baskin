import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { mergePrefs, CONTROLLABLE_TYPES, type NotifPrefs } from "@/lib/notifPrefs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notifPrefs: true },
  });

  return NextResponse.json(mergePrefs(user?.notifPrefs));
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await req.json().catch(() => null) as Partial<NotifPrefs> | null;
  if (!body) return NextResponse.json({ error: "Payload non valido" }, { status: 400 });

  // Ottieni le prefs correnti e fai il merge con il body
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notifPrefs: true },
  });
  const current = mergePrefs(user?.notifPrefs);

  const updated: NotifPrefs = {
    push: { ...current.push },
    inApp: { ...current.inApp },
  };

  // Applica solo i tipi controllabili per evitare injection di chiavi arbitrarie
  for (const type of CONTROLLABLE_TYPES) {
    if (body.push?.[type] !== undefined) updated.push[type] = !!body.push[type];
    if (body.inApp?.[type] !== undefined) updated.inApp[type] = !!body.inApp[type];
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notifPrefs: updated as object },
  });

  return NextResponse.json(updated);
}
