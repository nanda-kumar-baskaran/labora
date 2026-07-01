/**
 * POST /api/tests/seed
 * Seeds or re-seeds the built-in test catalog.
 * Admin only. Skips tests that already exist (by short_code).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireWriteAccess } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { getRepository } = await import("@/lib/db");
  const { SEED_TESTS } = await import("@/lib/db/seed-tests");
  const repo = await getRepository();

  const body = await req.json().catch(() => ({}));
  const overwrite = body.overwrite === true;

  const existing = await repo.listTests(session.tenant_id);
  const existingCodes = new Set(existing.map((t: any) => t.short_code));

  let added = 0;
  let skipped = 0;

  for (const t of SEED_TESTS) {
    if (existingCodes.has(t.short_code) && !overwrite) {
      skipped++;
      continue;
    }
    try {
      await repo.createTest({
        tenant_id: session.tenant_id,
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
      added++;
    } catch (e: any) {
      if (!e.message?.includes("UNIQUE")) {
        console.warn(`[seed] Could not add test "${t.name}":`, e.message);
      }
      skipped++;
    }
  }

  return NextResponse.json({
    success: true,
    added,
    skipped,
    total: SEED_TESTS.length,
    message: `Added ${added} tests, skipped ${skipped} already existing.`,
  });
}
