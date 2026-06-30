import { guardPage } from "@/lib/page-guard";

export default async function ResultsLayout({ children }: { children: React.ReactNode }) {
  await guardPage("result:enter");
  return <>{children}</>;
}
