import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffGuard } from "@/lib/apiAuth";

// GET — lista tutti i post inclusi bozze (coach+)
export async function GET() {
  const denied = await staffGuard();
  if (denied) {
    return denied;
  }

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      poll: { select: { id: true, question: true, closesAt: true, multiSelect: true } },
    },
  });

  return NextResponse.json(posts);
}
