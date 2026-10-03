import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { EventCreateSchema } from "@/lib/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { generateEventSlug } from "@/lib/slugUtils";
import { sendPushToAll } from "@/lib/notifications/webpush";
import { createAppNotification } from "@/lib/notifications/appNotifications";
import { inBackground } from "@/lib/background";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "get-events", 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const events = await prisma.event.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = EventCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const slug = await generateEventSlug(body.title);

  const event = await prisma.event.create({
    data: {
      title: body.title.trim(),
      slug: slug || null,
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      location: body.location?.trim() || null,
      description: body.description?.trim() || null,
      imageUrl: body.imageUrl ?? null,
      allowGuests: body.allowGuests ?? false,
      maxGuests: body.allowGuests ? (body.maxGuests ?? null) : null,
    },
  });

  if (session?.user?.id) {
    inBackground(
      logAudit({
        actorId: session.user.id,
        action: "CREATE_EVENT",
        targetType: "Event",
        targetId: event.id,
        after: { title: event.title, date: event.date },
      }),
      "audit create event"
    );
  }

  // Notifica push + in-app dopo la risposta a tutti
  const url = `/eventi/${event.slug ?? event.id}`;
  inBackground(
    sendPushToAll({ title: "Nuovo evento", body: event.title, url, type: "SYSTEM" }, false),
    "push new event"
  );
  inBackground(
    createAppNotification({
      type: "NEW_EVENT",
      title: "Nuovo evento",
      body: event.title,
      url,
    }),
    "notification new event"
  );

  return NextResponse.json(event, { status: 201 });
}
