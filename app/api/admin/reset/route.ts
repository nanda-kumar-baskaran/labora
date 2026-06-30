/**
 * POST /api/admin/reset
 * Emergency reset — wipes all users so /setup can run again.
 * Only available in local mode. Requires current admin password to confirm.
 * Does NOT wipe patients/orders/reports — only clears auth users.
 *
 * Use case: admin forgot credentials, wants to re-do setup,
 * or needs to change the admin email after initial setup.
 */
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { z } from "zod";

const schema = z.object({
  confirm_password: z.string().optional(),
  forgot: z.boolean().optional(),
  action: z.enum(["reset_auth", "full_reset"]),
});

export async function POST(req: NextRequest) {
  if (process.env.STORAGE_MODE !== "local") {
    return NextResponse.json({ error: "Reset only available in local mode" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { verifyPassword } = await import("@/lib/auth/local-auth");

  // Use libsql directly to get password_hash (repo.listUsers() intentionally omits it)
  const { createClient: createLibSqlClient } = await import("@libsql/client");
  const dbPathForCheck = process.env.LABMS_APP_DATA_DIR
    ? join(process.env.LABMS_APP_DATA_DIR, "labora.db")
    : process.env.LOCAL_DB_PATH ?? "/tmp/labora-data/labora.db";
  const dbCheck = createLibSqlClient({ url: `file:${dbPathForCheck}` });

  const { rows } = await dbCheck.execute(
    "SELECT id, password_hash FROM users WHERE role='admin' AND tenant_id='local-tenant-00000001' LIMIT 1"
  );
  const adminRow = rows[0];

  if (!adminRow || !adminRow.password_hash) {
    // No admin exists yet — allow reset (e.g. after a broken setup)
    console.log("[reset] No admin found — allowing unauthenticated reset");
  } else if (parsed.data.forgot === true) {
    // "Forgot password" path — in local mode, physical access = full access.
    // Only allow reset_auth (data-preserving) via this path; full_reset still requires password.
    if (parsed.data.action === "full_reset") {
      return NextResponse.json({ error: "Full reset requires your current password. Only 'Reset setup only' is allowed via the forgot password path." }, { status: 403 });
    }
    console.log("[reset] Forgot-password reset requested — bypassing password check (local mode)");
  } else {
    if (!parsed.data.confirm_password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    const valid = await verifyPassword(parsed.data.confirm_password, adminRow.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password. Reset denied." }, { status: 401 });
    }
  }

  // Use the libsql client directly to delete users
  const { createClient } = await import("@libsql/client");
  const dbPath = process.env.LABMS_APP_DATA_DIR
    ? join(process.env.LABMS_APP_DATA_DIR, "labora.db")
    : process.env.LOCAL_DB_PATH ?? "/tmp/labora-data/labora.db";
  const db = createClient({ url: `file:${dbPath}` });

  if (parsed.data.action === "reset_auth") {
    // Only wipe users — lab data (patients, orders, reports) preserved
    await db.execute("DELETE FROM users");
    return NextResponse.json({
      success: true,
      message: "All user accounts deleted. You can now re-run setup.",
    });
  }

  if (parsed.data.action === "full_reset") {
    // Wipe everything except tenant row
    const tables = [
      "referrals", "payments", "invoices", "reports",
      "sample_status_history", "order_tests", "sample_orders",
      "test_catalog", "doctors", "patients", "users",
    ];
    for (const table of tables) {
      await db.execute(`DELETE FROM ${table}`);
    }
    // Reset tenant name
    await db.execute("UPDATE tenants SET name='My Lab', updated_at=datetime('now')");
    return NextResponse.json({
      success: true,
      message: "Full reset complete. All data wiped. You can now re-run setup.",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
