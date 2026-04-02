import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

// PATCH /api/children/[childId] — aggiorna i dati di un figlio
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) {
    return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
  }

  const isStaff = await isCoachOrAdmin();
  if (child.parentId !== session.user.id && !isStaff) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, sportRole, sportRoleVariant, gender, birthDate, linkEmail, unlinkAccount } = body as {
    name?: string;
    sportRole?: number | null;
    sportRoleVariant?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    linkEmail?: string;       // collega un account esistente tramite email
    unlinkAccount?: boolean;  // scollega l'account collegato
  };

  // ── Collega account via email ─────────────────────────────────────────────
  if (linkEmail !== undefined) {
    const trimmedEmail = linkEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!targetUser) {
      return NextResponse.json({ error: "Nessun utente trovato con questa email" }, { status: 404 });
    }

    // Verifica che quell'account non sia già collegato a un altro Child
    const alreadyLinked = await prisma.child.findUnique({ where: { userId: targetUser.id } });
    if (alreadyLinked && alreadyLinked.id !== childId) {
      return NextResponse.json({ error: "Questo account è già collegato a un altro figlio" }, { status: 409 });
    }

    const updated = await prisma.child.update({
      where: { id: childId },
      data: { userId: targetUser.id },
    });
    return NextResponse.json(updated);
  }

  // ── Scollega account ──────────────────────────────────────────────────────
  if (unlinkAccount) {
    const updated = await prisma.child.update({
      where: { id: childId },
      data: { userId: null },
    });
    return NextResponse.json(updated);
  }

  // ── Aggiornamento dati base ───────────────────────────────────────────────
  const trimmedName = name?.trim().slice(0, 60);
  if (trimmedName !== undefined && !trimmedName) {
    return NextResponse.json({ error: "Il nome non può essere vuoto" }, { status: 400 });
  }

  const updated = await prisma.child.update({
    where: { id: childId },
    data: {
      ...(trimmedName !== undefined && { name: trimmedName }),
      ...(sportRole !== undefined && { sportRole: sportRole ?? null }),
      ...(sportRoleVariant !== undefined && { sportRoleVariant: sportRoleVariant ?? null }),
      ...(gender !== undefined && { gender: (gender as "MALE" | "FEMALE" | null) ?? null }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/children/[childId] — elimina un figlio
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) {
    return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
  }

  const isStaff = await isCoachOrAdmin();
  if (child.parentId !== session.user.id && !isStaff) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  await prisma.child.delete({ where: { id: childId } });
  return new NextResponse(null, { status: 204 });
}
