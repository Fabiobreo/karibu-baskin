import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToAll, sendPushToFilter } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";

const NotifySchema = z.object({
  title: z.string().min(1).max(100),
  body:  z.string().min(1).max(300),
  url:   z.string().max(200).optional(),
  // Targeting: almeno uno tra teamId, sportRole o targetAll deve essere fornito
  teamId:    z.string().optional(),
  sportRole: z.number().int().min(1).max(5).nullable().optional(),
  targetAll: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = NotifySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }

  const { title, body, url, teamId, sportRole, targetAll } = parsed.data;

  if (!teamId && sportRole == null && !targetAll) {
    return NextResponse.json(
      { error: "Specifica almeno un destinatario: squadra, ruolo, o targetAll: true" },
      { status: 400 }
    );
  }

  const payload = { title, body, url: url ?? "/", type: "SYSTEM" };

  let result: { sent: number; removed: number };

  if (targetAll) {
    result = await sendPushToAll(payload);
  } else {
    result = await sendPushToFilter({ teamId, sportRole }, payload);
  }

  // Notifica in-app broadcast (visibile a tutti nel centro notifiche)
  createAppNotification({ type: "SYSTEM", title, body, url: url ?? "/" })
    .catch((err) => console.error("[notify] app notification", err));

  return NextResponse.json({ sent: result.sent, removed: result.removed });
}
