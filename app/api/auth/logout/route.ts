import { NextResponse } from "next/server";

export async function POST() {
  const mode = process.env.STORAGE_MODE ?? "cloud";
  if (mode === "local") {
    const { clearLocalSession } = await import("@/lib/auth/local-auth");
    const { name, value, options } = clearLocalSession();
    const res = NextResponse.json({ success: true });
    res.cookies.set(name, value, options as any);
    return res;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
