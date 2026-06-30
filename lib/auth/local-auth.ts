import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/db/types";

const SECRET = process.env.LOCAL_AUTH_SECRET ?? "labms-offline-secret-change-me";
const COOKIE_NAME = "labms_local_session";

export interface LocalSession {
  userId: string;
  tenantId: string;
  role: UserRole;
  fullName: string;
  email: string;
  expiresAt: number;
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function encodeSession(session: LocalSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function decodeSession(token: string): LocalSession | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    if (sign(payload) !== sig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as LocalSession;
    if (data.expiresAt < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  // Cost 8: ~50ms (vs 200ms+ at 10). Fine for a local desktop app — no remote brute-force risk.
  return bcrypt.hash(password, 8);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getLocalSession(): Promise<LocalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export function setLocalSessionCookie(session: LocalSession): { name: string; value: string; options: object } {
  const token = encodeSession(session);
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    },
  };
}

export function clearLocalSession(): { name: string; value: string; options: object } {
  return { name: COOKIE_NAME, value: "", options: { maxAge: 0, path: "/" } };
}
