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
  if (process.env.STORAGE_MODE !== "local") {
    return NextResponse.json({ error: "Setup only available in local mode" }, { status: 400 });
  }
  const { getRepository } = await import("@/lib/db");
  const repo = await getRepository();
  const users = await repo.listUsers("local-tenant-00000001");
  return NextResponse.json({ needsSetup: users.length === 0 });
}

export async function POST(req: NextRequest) {
  if (process.env.STORAGE_MODE !== "local") {
    return NextResponse.json({ error: "Setup only available in local mode" }, { status: 400 });
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
