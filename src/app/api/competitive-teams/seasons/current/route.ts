import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

export async function PUT(req: Request) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { label } = await req.json() as { label: string };
  if (!label?.trim()) {
    return NextResponse.json({ error: "label richiesto" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.season.updateMany({ data: { isCurrent: false } }),
    prisma.season.upsert({
      where: { label },
      create: { label, isCurrent: true },
      update: { isCurrent: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
