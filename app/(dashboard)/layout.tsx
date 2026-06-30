import { redirect } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { AutoLogout } from "@/components/auth/auto-logout";
import { getRepository } from "@/lib/db";

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AutoLogout />
      <Sidebar role={session.role} tenantName={tenantName} userName={session.full_name} mode={mode} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
