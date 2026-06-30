import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const mode = process.env.STORAGE_MODE ?? "cloud";
  if (mode !== "local") {
    return NextResponse.json({ error: "Use Supabase auth in cloud mode" }, { status: 400 });
  }
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const { getRepository } = await import("@/lib/db");
  const { verifyPassword, setLocalSessionCookie } = await import("@/lib/auth/local-auth");
  // In local mode, tenant is always the single local tenant
  const repo = await getRepository();
  const user = await repo.getUserByEmail(parsed.data.email, "local-tenant-00000001");
  if (!user || !user.password_hash) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  const valid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  const { name, value, options } = setLocalSessionCookie({
    userId: user.id, tenantId: user.tenant_id, role: user.role,
    fullName: user.full_name, email: user.email || parsed.data.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const res = NextResponse.json({ success: true, role: user.role });
  res.cookies.set(name, value, options as any);
  return res;
}
