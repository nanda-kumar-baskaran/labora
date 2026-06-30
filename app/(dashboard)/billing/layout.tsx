import { guardPage } from "@/lib/page-guard";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  await guardPage("billing:view");
  return <>{children}</>;
}
