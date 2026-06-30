import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireSession();

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can reset passwords" }, { status: 403 });
  }

  // Only meaningful in local mode — cloud uses Supabase password reset
  if (process.env.STORAGE_MODE !== "local") {
    return NextResponse.json(
      { error: "Use Supabase password reset in cloud mode" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });
  }

  const repo = await getRepository();

  // Verify user exists in same tenant
  const user = await repo.getUser(id);
  if (!user || user.tenant_id !== session.tenant_id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { hashPassword } = await import("@/lib/auth/local-auth");
  const password_hash = await hashPassword(parsed.data.new_password);

  await repo.updateUser(id, session.tenant_id, { password_hash });

  return NextResponse.json({ success: true, message: `Password reset for ${user.full_name}` });
}
