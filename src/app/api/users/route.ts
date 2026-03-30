import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/users — lista tutti gli utenti (solo ADMIN, protezione via middleware)
export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
      createdAt: true,
      _count: { select: { registrations: true } },
    },
  });
  return NextResponse.json(users);
}
