import { guardPage } from "@/lib/page-guard";

export default async function DashboardSegmentLayout({ children }: { children: React.ReactNode }) {
  await guardPage("dashboard:admin");
  return <>{children}</>;
}
