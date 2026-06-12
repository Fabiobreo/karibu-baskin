import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { uploadImage, type BlobFolder } from "@/lib/blob";
import { z } from "zod";

const STAFF_FOLDERS = new Set<BlobFolder>(["teams", "matches", "events", "posts", "opponents"]);
const USER_FOLDERS = new Set<BlobFolder>(["avatars"]);

const BodySchema = z.object({
  folder: z.enum(["avatars", "teams", "matches", "events", "posts", "opponents"]),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "upload", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse({ folder: formData.get("folder") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Parametro folder non valido" },
      { status: 400 }
    );
  }

  const { folder } = parsed.data;

  // Folder staff-only richiedono COACH o superiore
  if (STAFF_FOLDERS.has(folder) && !(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  // Folder utente richiedono solo autenticazione (già verificata sopra)
  if (!USER_FOLDERS.has(folder) && !STAFF_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Cartella non valida" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }

  try {
    const result = await uploadImage(file, { folder });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore durante l'upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
