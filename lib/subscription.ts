/**
 * Subscription enforcement — cloud mode only.
 *
 * Call requireWriteAccess(session) at the top of every mutating API route
 * (POST / PUT / PATCH / DELETE).  Returns a NextResponse 402 if the tenant's
 * subscription has expired; throws for non-API contexts.
 *
 * Offline / local mode is always allowed — subscriptions don't apply to the
 * desktop build.
 */

import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/session";

export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

export interface TenantSubscription {
  status: SubscriptionStatus;
  end_date: Date;
  /** true when the subscription is currently valid (trial or active and not past end_date) */
  is_valid: boolean;
  /** days remaining; negative means already expired */
  days_remaining: number;
}

/** Fetch subscription info for a tenant from Supabase (admin client, bypasses RLS). */
export async function getTenantSubscription(tenantId: string): Promise<TenantSubscription> {
  const mode = process.env.STORAGE_MODE ?? "cloud";
  if (mode === "local") {
    // Offline mode: subscription always valid
    return {
      status: "active",
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      is_valid: true,
      days_remaining: 365,
    };
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("subscription_status, subscription_end_date")
    .eq("id", tenantId)
    .single();

  if (error || !data) {
    // If we can't read the tenant, treat as expired (fail-safe)
    return {
      status: "expired",
      end_date: new Date(0),
      is_valid: false,
      days_remaining: -1,
    };
  }

  const end_date = new Date(data.subscription_end_date);
  const now = new Date();
  const ms_remaining = end_date.getTime() - now.getTime();
  const days_remaining = Math.floor(ms_remaining / (1000 * 60 * 60 * 24));

  // A subscription is valid if status is trial/active AND the end date hasn't passed
  const status = data.subscription_status as SubscriptionStatus;
  const is_valid =
    (status === "trial" || status === "active") && days_remaining >= 0;

  return { status, end_date, is_valid, days_remaining };
}

/**
 * Use in mutating API routes (POST/PUT/PATCH/DELETE).
 * Returns a 402 NextResponse if the tenant subscription is expired.
 * Returns null if access is allowed (caller should proceed).
 *
 * Usage:
 *   const denied = await requireWriteAccess(session);
 *   if (denied) return denied;
 */
export async function requireWriteAccess(
  session: SessionUser
): Promise<NextResponse | null> {
  const mode = process.env.STORAGE_MODE ?? "cloud";
  if (mode === "local") return null; // offline app: always allowed

  const sub = await getTenantSubscription(session.tenant_id);
  if (sub.is_valid) return null;

  return NextResponse.json(
    {
      error: "Subscription expired",
      message:
        "Your subscription has expired. Please renew to continue creating and updating records.",
      subscription_status: sub.status,
      subscription_end_date: sub.end_date.toISOString(),
    },
    { status: 402 }
  );
}
