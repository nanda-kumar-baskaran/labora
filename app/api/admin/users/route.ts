import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  role: z.enum(["admin", "staff", "technician", "pathologist"]),
  phone: z.string().optional(),
  password: z.string().min(8).optional(), // required in local mode
});

export async function GET() {
  const session = await requireSession();
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const repo = await getRepository();
  const users = await repo.listUsers(session.tenant_id);
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const mode = process.env.STORAGE_MODE ?? "cloud";
  const repo = await getRepository();
  if (mode === "local") {
    if (!parsed.data.password) return NextResponse.json({ error: "Password required in local mode" }, { status: 400 });
    const { hashPassword } = await import("@/lib/auth/local-auth");
    const password_hash = await hashPassword(parsed.data.password);
    const userId = randomBytes(16).toString("hex");
    const user = await repo.createUser({
      id: userId, tenant_id: session.tenant_id,
      full_name: parsed.data.full_name, role: parsed.data.role,
      phone: parsed.data.phone, email: parsed.data.email,
      password_hash, is_active: true,
    });
    return NextResponse.json({ id: user.id, email: parsed.data.email }, { status: 201 });
  }
  // Cloud mode: use Supabase admin API
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = await createAdminClient();
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({ email: parsed.data.email, email_confirm: true, password: randomBytes(8).toString("hex") + "A1!" });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
  try {
    await repo.createUser({ id: authUser.user.id, tenant_id: session.tenant_id, full_name: parsed.data.full_name, role: parsed.data.role, phone: parsed.data.phone, email: parsed.data.email, is_active: true });
    return NextResponse.json({ id: authUser.user.id, email: parsed.data.email }, { status: 201 });
  } catch (e: any) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
