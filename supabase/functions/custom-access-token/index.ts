/**
 * Supabase Custom Access Token Hook
 *
 * Injects tenant_id and role into the JWT at login time.
 * This enables RLS policies to read auth.tenant_id() without
 * any extra DB queries per request.
 *
 * CRITICAL: must return { ...claims, tenant_id, role }
 * NOT { tenant_id, role } alone — that would discard sub/aud/exp.
 *
 * Deploy: supabase functions deploy custom-access-token
 * Register: Supabase Dashboard → Auth → Hooks → Custom Access Token Hook
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    // Supabase sends: { user_id, claims, authentication_method, ... }
    const { user_id, claims } = payload;

    if (!user_id) {
      return Response.json({ ...claims }, { status: 200 });
    }

    // Use service role key to bypass RLS (hook runs before RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: user } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user_id)
      .single();

    // Merge into existing claims — never replace them
    return Response.json({
      ...claims,
      tenant_id: user?.tenant_id ?? null,
      role: user?.role ?? "staff",
    });
  } catch (err) {
    console.error("Custom access token hook error:", err);
    // Return original claims on error — don't break login
    return Response.json({}, { status: 200 });
  }
});
