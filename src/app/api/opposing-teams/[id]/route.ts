import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { OpposingTeamUpdateSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { generateOpposingTeamSlug } from "@/lib/slugUtils";
import { deleteImage } from "@/lib/blob";
import { inBackground } from "@/lib/background";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = OpposingTeamUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const { id } = await params;
  const before = await prisma.opposingTeam.findUnique({
    where: { id },
    select: { name: true, city: true, notes: true, slug: true, imageUrl: true },
  });
  let newSlug: string | undefined;
  if (body.name !== undefined && body.name.trim() !== before?.name) {
    const generated = await generateOpposingTeamSlug(body.name);
    if (generated) newSlug = generated;
  }
  const team = await prisma.opposingTeam.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(newSlug !== undefined && { slug: newSlug }),
      ...(body.city !== undefined && { city: body.city?.trim() || null }),
      ...(body.address !== undefined && { address: body.address?.trim() || null }),
      ...(body.website !== undefined && { website: body.website?.trim() || null }),
      ...(body.colors !== undefined && { colors: body.colors?.trim() || null }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
      ...("ratingMu" in body && { ratingMu: body.ratingMu ?? null }),
    },
  });
  // Se l'immagine è stata sostituita o rimossa, elimina il vecchio blob.
  if (body.imageUrl !== undefined && before?.imageUrl && before.imageUrl !== team.imageUrl) {
    inBackground(deleteImage(before.imageUrl), "blob delete old opposing team image");
  }
  if (authSession?.user?.id) {
    inBackground(
      logAudit({
        actorId: authSession.user.id,
        action: "UPDATE_OPPOSING_TEAM",
        targetType: "OpposingTeam",
        targetId: id,
        before,
        after: { name: team.name, city: team.city, notes: team.notes },
      }),
      "audit update opposing team"
    );
  }
  return NextResponse.json(team);
}

export async function DELETE(_req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.opposingTeam.findUnique({
    where: { id },
    select: { name: true, city: true },
  });
  const conflict = `"${before?.name ?? "La squadra"}" compare in partite del club o fra i risultati di un girone: finché ci sono, non si può eliminare.`;
  try {
    // Le partite del club hanno sul DB `ON DELETE SET NULL`: senza questo
    // controllo l'eliminazione riuscirebbe e lascerebbe partite senza
    // avversario. Le partite di girone, invece, la bloccano col vincolo (P2003).
    const [clubMatches, groupMatches] = await Promise.all([
      prisma.match.count({ where: { opponentId: id } }),
      prisma.groupMatch.count({ where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] } }),
    ]);
    if (clubMatches + groupMatches > 0) {
      return NextResponse.json({ error: conflict }, { status: 409 });
    }
    await prisma.opposingTeam.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Una partita aggiunta fra il conteggio e la delete: stesso 409.
      if (err.code === "P2003") {
        return NextResponse.json({ error: conflict }, { status: 409 });
      }
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Squadra avversaria non trovata" }, { status: 404 });
      }
    }
    console.error("[opposing-teams] delete", err);
    return NextResponse.json({ error: "Errore nell'eliminazione" }, { status: 500 });
  }
  if (authSession?.user?.id) {
    inBackground(
      logAudit({
        actorId: authSession.user.id,
        action: "DELETE_OPPOSING_TEAM",
        targetType: "OpposingTeam",
        targetId: id,
        before,
      }),
      "audit delete opposing team"
    );
  }
  return new NextResponse(null, { status: 204 });
}
