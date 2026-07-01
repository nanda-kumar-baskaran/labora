import { redirect } from "next/navigation";
import { cache } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { AutoLogout } from "@/components/auth/auto-logout";

const getCachedSession = cache(getSession);

/**
 * Single DB call: fetch tenant name + subscription status together.
 * Replaces the old getTenant() + getTenantSubscription() pair (2 round-trips → 1).
 */
const getCachedTenantInfo = cache(async (tenantId: string, mode: string) => {
  if (mode === "local") {
    return { name: "Your Lab", subStatus: "active" as const, daysRemaining: 365 };
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = await createAdminClient();
    const { data } = await admin
      .from("tenants")
      .select("name, subscription_status, subscription_end_date")
      .eq("id", tenantId)
      .single();

    if (!data) return { name: "Your Lab", subStatus: "expired" as const, daysRemaining: -1 };

    const endDate = new Date(data.subscription_end_date);
    const daysRemaining = Math.floor((endDate.getTime() - Date.now()) / 86_400_000);
    const subStatus = data.subscription_status as "trial" | "active" | "expired" | "cancelled";
    return { name: data.name ?? "Your Lab", subStatus, daysRemaining };
  } catch {
    return { name: "Your Lab", subStatus: "expired" as const, daysRemaining: -1 };
  }
});

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session) redirect("/login");

  const mode = (process.env.STORAGE_MODE ?? "cloud") as "cloud" | "local";
  const { name: tenantName, subStatus, daysRemaining } = await getCachedTenantInfo(session.tenant_id, mode);

  const isValid = (subStatus === "trial" || subStatus === "active") && daysRemaining >= 0;
  const showExpiredBanner  = mode === "cloud" && !isValid;
  const showWarningBanner  = mode === "cloud" && isValid && daysRemaining <= 7;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AutoLogout />
      <Sidebar role={session.role} tenantName={tenantName} userName={session.full_name} mode={mode} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {showExpiredBanner && (
          <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between text-sm">
            <span>
              <strong>Subscription expired.</strong> Your lab is in read-only mode — you can view data but cannot create new records.
            </span>
            {session.role === "admin" && (
              <Link href="/subscription" className="ml-4 underline font-semibold whitespace-nowrap hover:text-red-200">
                Renew subscription →
              </Link>
            )}
          </div>
        )}
        {showWarningBanner && (
          <div className="bg-amber-500 text-white px-6 py-3 flex items-center justify-between text-sm">
            <span>
              <strong>Subscription expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.</strong> Renew now to avoid interruption.
            </span>
            {session.role === "admin" && (
              <Link href="/subscription" className="ml-4 underline font-semibold whitespace-nowrap hover:text-amber-200">
                Manage subscription →
              </Link>
            )}
          </div>
        )}
        <div className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
