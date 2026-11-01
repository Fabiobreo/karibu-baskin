import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/authjs";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { sendPushToEndpoint } from "@/lib/notifications/webpush";
import { PushTestSchema } from "@/lib/schemas/push";

/**
 * POST — notifica di prova al dispositivo che la chiede, dal profilo.
 *
 * Arriva solo all'iscrizione del chiamante (sua, o anonima se non ha fatto
 * l'accesso): non si può usare per mandare notifiche ad altri. Si attende
 * l'invio, perché la risposta dice se il servizio push l'ha accettata.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "push-test", 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PushTestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const session = await auth();
  const t = await getTranslations("notifPanel");
  try {
    const { sent } = await sendPushToEndpoint(parsed.data.endpoint, session?.user?.id ?? null, {
      title: t("testTitle"),
      body: t("testBody"),
      url: "/profilo?tab=notifiche",
      type: "TEST",
    });
    return NextResponse.json({ sent });
  } catch (err) {
    console.error("[push] test", err);
    return NextResponse.json({ error: "Invio non riuscito" }, { status: 500 });
  }
}
