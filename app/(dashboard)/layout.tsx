import { redirect } from "next/navigation";
import { cache } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { AutoLogout } from "@/components/auth/auto-logout";
import { getRepository } from "@/lib/db";
import { getTenantSubscription } from "@/lib/subscription";

const getCachedSession = cache(getSession);

const getCachedTenantName = cache(async (tenantId: string) => {
  const repo = await getRepository();
  const tenant = await repo.getTenant(tenantId);
  return tenant?.name ?? "Your Lab";
});

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session) redirect("/login");

  const tenantName = await getCachedTenantName(session.tenant_id);
  const mode = (process.env.STORAGE_MODE ?? "cloud") as "cloud" | "local";

  // Subscription check — cloud mode only
  const sub = mode === "cloud" ? await getTenantSubscription(session.tenant_id) : null;
  const showExpiredBanner = sub && !sub.is_valid;
  const showWarningBanner = sub && sub.is_valid && sub.days_remaining <= 7;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AutoLogout />
      <Sidebar role={session.role} tenantName={tenantName} userName={session.full_name} mode={mode} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* Subscription expired banner */}
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
        {/* Subscription expiring soon warning */}
        {showWarningBanner && (
          <div className="bg-amber-500 text-white px-6 py-3 flex items-center justify-between text-sm">
            <span>
              <strong>Subscription expires in {sub.days_remaining} day{sub.days_remaining !== 1 ? "s" : ""}.</strong> Renew now to avoid interruption.
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
