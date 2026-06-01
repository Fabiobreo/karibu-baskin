import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { deleteImage } from "@/lib/blob";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const PatchSchema = z.object({ hidden: z.boolean() });

// Moderazione: mostra/nascondi un post dalla Gallery senza eliminarlo.
export async function PATCH(req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }
  const { id } = await params;
  try {
    const updated = await prisma.instagramPost.update({
      where: { id },
      data: { hidden: parsed.data.hidden },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Post non trovato" }, { status: 404 });
  }
}

// Eliminazione definitiva: rimuove i Blob associati e il record.
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const { id } = await params;
  const post = await prisma.instagramPost.findUnique({
    where: { id },
    select: { blobUrls: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post non trovato" }, { status: 404 });
  }
  await Promise.all(post.blobUrls.map((u) => deleteImage(u)));
  await prisma.instagramPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
