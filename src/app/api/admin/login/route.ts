import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword, getAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (!password || !validateAdminPassword(password)) {
    return NextResponse.json({ error: "Password non valida" }, { status: 401 });
  }

  const token = getAdminToken(password);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 giorni
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
