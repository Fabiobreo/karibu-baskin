import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";

function computeToken(password: string): string {
  const secret = process.env.COOKIE_SECRET ?? "default-secret-change-me";
  return createHmac("sha256", secret).update(password).digest("hex");
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const password = process.env.ADMIN_PASSWORD ?? "";
  const expected = computeToken(password);

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function validateAdminPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD ?? "";
  try {
    return timingSafeEqual(Buffer.from(input), Buffer.from(password));
  } catch {
    return false;
  }
}

export function getAdminToken(password: string): string {
  return computeToken(password);
}

export { COOKIE_NAME };
