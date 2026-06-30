import { guardPage } from "@/lib/page-guard";

export default async function AuditLayout({ children }: { children: React.ReactNode }) {
  await guardPage("audit:view");
  return <>{children}</>;
}
