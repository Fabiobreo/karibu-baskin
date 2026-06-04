import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { SuggestionUpdateSchema } from "@/lib/schemas/suggestion";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const ADMIN_SELECT = {
  id: true,
  category: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  notes: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true, customImage: true } },
    },
  },
} as const;

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = SuggestionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { id } = await params;
  try {
    const updated = await prisma.suggestion.update({
      where: { id },
      data: { status: parsed.data.status },
      select: ADMIN_SELECT,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.suggestion.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }
    throw err;
  }
}
