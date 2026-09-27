import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { resolveFilterUserIds, sendPushToAll, sendPushToUsers } from "@/lib/notifications/webpush";
import {
  createAppNotification,
  createTargetedAppNotifications,
} from "@/lib/notifications/appNotifications";

// Only relative same-origin paths are allowed — prevents open-redirect phishing via push.
const relativeUrlRegex = /^\/[\w\-/?=&%.#]*$/;

const NotifySchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  url: z
    .string()
    .max(200)
    .regex(relativeUrlRegex, "L'URL deve essere un percorso relativo (es. /allenamenti)")
    .optional(),
  // Targeting: almeno uno tra teamId, sportRole o targetAll deve essere fornito
  teamId: z.string().optional(),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { title, body, url, teamId, sportRole, targetAll } = parsed.data;

  if (!teamId && sportRole == null && !targetAll) {
    return NextResponse.json(
      { error: "Specifica almeno un destinatario: squadra, ruolo, o targetAll: true" },
      { status: 400 }
    );
  }

  const target = url ?? "/";
  const payload = { title, body, url: target, type: "SYSTEM" };

  let result: { sent: number; removed: number };
  let recipients: number | null = null;
  try {
    // Push e notifica in-app vanno alle stesse persone: prima la copia in-app
    // partiva sempre per tutti, anche con il filtro per squadra o ruolo.
    const userIds = targetAll ? null : await resolveFilterUserIds({ teamId, sportRole });
    if (userIds === null) {
      result = await sendPushToAll(payload);
      createAppNotification({ type: "SYSTEM", title, body, url: target }).catch((err) =>
        console.error("[notify] app notification", err)
      );
    } else {
      recipients = userIds.length;
      result = await sendPushToUsers(userIds, payload);
      createTargetedAppNotifications(userIds, { type: "SYSTEM", title, body, url: target }).catch(
        (err) => console.error("[notify] app notification", err)
      );
    }
  } catch (err) {
    console.error("[notify] invio", err);
    return NextResponse.json({ error: "Invio non riuscito. Riprova." }, { status: 500 });
  }

  // Nel registro: chi ha mandato cosa e a chi. Serve anche a capire quanto
  // si usa l'invio manuale.
  const session = await auth();
  if (session?.user?.id) {
    logAudit({
      actorId: session.user.id,
      action: "SEND_NOTIFICATION",
      targetType: "Notification",
      targetId: targetAll
        ? "all"
        : [teamId, sportRole != null ? `role-${sportRole}` : null].filter(Boolean).join("+"),
      after: {
        title,
        body,
        url: target,
        audience: targetAll ? "all" : { teamId: teamId ?? null, sportRole: sportRole ?? null },
        recipients,
        devices: result.sent,
      },
    }).catch((err) => console.error("[audit] send notification", err));
  }

  return NextResponse.json({ sent: result.sent, removed: result.removed });
}
