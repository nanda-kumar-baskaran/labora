import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

const setupSchema = z.object({
  lab_name: z.string().min(2),
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function GET() {
  const mode = process.env.STORAGE_MODE ?? "cloud";

  if (mode === "local") {
    const { getRepository } = await import("@/lib/db");
    const repo = await getRepository();
    const users = await repo.listUsers("local-tenant-00000001");
    return NextResponse.json({ needsSetup: users.length === 0 });
  }

  // Cloud mode: setup is always available (multi-tenant, each lab self-registers)
  return NextResponse.json({ needsSetup: true, mode: "cloud" });
}

export async function POST(req: NextRequest) {
  const mode = process.env.STORAGE_MODE ?? "cloud";

  if (mode !== "local") {
    // Cloud mode: create Supabase auth user + tenant + users row
    return handleCloudSetup(req);
  }
  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { getRepository } = await import("@/lib/db");
  const { hashPassword, setLocalSessionCookie } = await import("@/lib/auth/local-auth");
  const repo = await getRepository();

  // Check no users exist
  const existing = await repo.listUsers("local-tenant-00000001");
  if (existing.length > 0) {
    return NextResponse.json({ error: "Lab already set up. Please log in." }, { status: 409 });
  }

  // Parallelize: hash password + update tenant name simultaneously
  const [password_hash] = await Promise.all([
    hashPassword(parsed.data.password),
    repo.updateTenant("local-tenant-00000001", { name: parsed.data.lab_name }),
  ]);

  const userId = randomBytes(16).toString("hex");
  await repo.createUser({
    id: userId,
    tenant_id: "local-tenant-00000001",
    full_name: parsed.data.full_name,
    role: "admin",
    email: parsed.data.email,
    password_hash,
    is_active: true,
  });

  // Seed built-in test catalog in background (non-blocking for UX)
  seedTestCatalog(repo, "local-tenant-00000001").catch(e =>
    console.error("[setup] Test catalog seeding failed:", e)
  );

  // Auto-login
  const { name, value, options } = setLocalSessionCookie({
    userId, tenantId: "local-tenant-00000001",
    role: "admin", fullName: parsed.data.full_name,
    email: parsed.data.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const res = NextResponse.json({ success: true, message: "Lab created with built-in test catalog" });
  res.cookies.set(name, value, options as any);
  return res;
}

// ── Cloud mode setup ──────────────────────────────────────────────────
async function handleCloudSetup(req: NextRequest) {
  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { createAdminClient } = await import("@/lib/supabase/server");
  const { randomUUID } = await import("crypto");
  const admin = await createAdminClient();

  // 1. Create Supabase auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? "Failed to create user" }, { status: 400 });
  }

  const tenantId = randomUUID();
  const slug = parsed.data.lab_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + tenantId.slice(0, 6);

  // 2. Create tenant — starts expired until payment received
  const { error: tenantErr } = await admin.from("tenants").insert({
    id: tenantId,
    name: parsed.data.lab_name,
    slug,
    plan: "starter",
    report_header: parsed.data.lab_name,
    report_footer: `${parsed.data.lab_name} — Report verified by licensed pathologist`,
    subscription_status: "expired",
    subscription_end_date: "2000-01-01T00:00:00Z",
  });
  if (tenantErr) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: tenantErr.message }, { status: 500 });
  }

  // 3. Create users row (links auth user to tenant)
  const { error: userErr } = await admin.from("users").insert({
    id: authData.user.id,
    tenant_id: tenantId,
    full_name: parsed.data.full_name,
    role: "admin",
    email: parsed.data.email,
    is_active: true,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("tenants").delete().eq("id", tenantId);
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  // 4. Seed test catalog in background
  seedCloudTestCatalog(admin, tenantId).catch(e =>
    console.error("[cloud-setup] Test catalog seeding failed:", e)
  );

  return NextResponse.json({ success: true, message: "Lab created! Please sign in." });
}

async function seedCloudTestCatalog(admin: any, tenantId: string) {
  const { SEED_TESTS } = await import("@/lib/db/seed-tests");
  const tests = SEED_TESTS.map((t: any) => ({
    tenant_id: tenantId,
    name: t.name,
    short_code: t.short_code,
    category: t.category,
    sample_type: t.sample_type,
    reference_range: t.reference_range,
    unit: t.unit,
    price: t.price,
    turnaround_hrs: t.turnaround_hrs,
    is_active: true,
  }));
  await admin.from("test_catalog").insert(tests);
}

async function seedTestCatalog(repo: any, tenantId: string) {
  const { SEED_TESTS } = await import("@/lib/db/seed-tests");

  // Only seed if catalog is empty
  const existing = await repo.listTests(tenantId);
  if (existing.length > 0) {
    console.log(`[setup] Test catalog already has ${existing.length} tests — skipping seed`);
    return;
  }

  console.log(`[setup] Seeding ${SEED_TESTS.length} built-in tests...`);
  const now = new Date().toISOString();

  for (const t of SEED_TESTS) {
    try {
      await repo.createTest({
        tenant_id: tenantId,
        name: t.name,
        short_code: t.short_code,
        category: t.category,
        sample_type: t.sample_type,
        reference_range: t.reference_range,
        unit: t.unit,
        price: t.price,
        turnaround_hrs: t.turnaround_hrs,
        is_active: true,
        cost: undefined,
        method: undefined,
      });
    } catch (e: any) {
      // Skip duplicate short_code conflicts silently
      if (!e.message?.includes("UNIQUE")) {
        console.warn(`[setup] Could not seed test "${t.name}":`, e.message);
      }
    }
  }
  console.log(`[setup] Test catalog seeded successfully`);
}
