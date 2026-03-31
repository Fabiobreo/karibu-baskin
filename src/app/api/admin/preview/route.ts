import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import type { AppRole } from "@prisma/client";

const VALID_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
const COOKIE = "preview_role";

// POST /api/admin/preview — attiva preview con il ruolo specificato
export async function POST(req: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user?.appRole === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { role } = await req.json().catch(() => ({})) as { role?: AppRole };
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, role, { path: "/", sameSite: "lax", httpOnly: false });
  return res;
}

// DELETE /api/admin/preview — disattiva preview
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
