import { guardPage } from "@/lib/page-guard";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await guardPage("settings:view");
  return <>{children}</>;
}
