import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  if (process.env.STORAGE_MODE !== "local") {
    return NextResponse.json({ error: "Use Supabase in cloud mode" }, { status: 400 });
  }

  const session = await requireSession();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });
  }

  const repo = await getRepository();
  const user = await repo.getUser(session.id);
  if (!user || !user.password_hash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { verifyPassword, hashPassword } = await import("@/lib/auth/local-auth");
  const valid = await verifyPassword(parsed.data.current_password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const password_hash = await hashPassword(parsed.data.new_password);
  await repo.updateUser(session.id, session.tenant_id, { password_hash });

  return NextResponse.json({ success: true });
}
