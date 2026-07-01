/**
 * GET  /api/admin/subscription  — fetch current subscription status
 * POST /api/admin/subscription  — extend subscription (admin manually sets end date)
 *
 * Cloud mode only.  Offline mode always returns a stub "active" subscription.
 */

import { requireSession } from "@/lib/session";
import { getTenantSubscription } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const session = await requireSession();
  const mode = process.env.STORAGE_MODE ?? "cloud";
  if (mode === "local") {
    return NextResponse.json({ status: "active", end_date: null, days_remaining: 365, is_valid: true });
  }
  const sub = await getTenantSubscription(session.tenant_id);
  return NextResponse.json({
    status: sub.status,
    end_date: sub.end_date.toISOString(),
    days_remaining: sub.days_remaining,
    is_valid: sub.is_valid,
  });
}

const extendSchema = z.object({
  /** How many months to extend from today */
  months: z.coerce.number().int().min(1).max(12).default(1),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can manage subscriptions" }, { status: 403 });
  }
  const mode = process.env.STORAGE_MODE ?? "cloud";
  if (mode === "local") {
    return NextResponse.json({ error: "Subscription management not available in offline mode" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = extendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = await createAdminClient();

  // Calculate new end date: max(today, current_end) + N months
  const { data: current } = await admin
    .from("tenants")
    .select("subscription_end_date, subscription_status")
    .eq("id", session.tenant_id)
    .single();

  const base = current?.subscription_end_date
    ? new Date(Math.max(Date.now(), new Date(current.subscription_end_date).getTime()))
    : new Date();

  const newEndDate = new Date(base);
  newEndDate.setMonth(newEndDate.getMonth() + parsed.data.months);

  const { error } = await admin
    .from("tenants")
    .update({
      subscription_status: "active",
      subscription_end_date: newEndDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    subscription_status: "active",
    subscription_end_date: newEndDate.toISOString(),
    message: `Subscription extended to ${newEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
  });
}
