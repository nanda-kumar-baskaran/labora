/**
 * Supabase Custom Access Token Hook — debug version
 */

Deno.serve(async (req: Request) => {
  let claims: Record<string, unknown> = {};

  try {
    const payload = await req.json();
    const { user_id } = payload;
    claims = payload.claims ?? {};

    if (!user_id) {
      return Response.json({ claims });
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "MISSING_URL";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "MISSING_KEY";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "MISSING_ANON";

    // Log env var availability (not values)
    console.log("URL present:", url !== "MISSING_URL", "len:", url.length);
    console.log("SRK present:", key !== "MISSING_KEY", "len:", key.length);
    console.log("ANON present:", anonKey !== "MISSING_ANON");

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0");

    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${key}` } }
    });

    const { data: user, error } = await admin
      .from("users")
      .select("tenant_id, role")
      .eq("id", user_id)
      .single();

    console.log("DB result:", JSON.stringify({ user, error: error?.message }));

    if (error || !user) {
      return Response.json({ claims });
    }

    return Response.json({
      claims: {
        ...claims,
        tenant_id: user.tenant_id,
        role: user.role,
      }
    });
  } catch (err) {
    console.error("Hook error:", String(err));
    return Response.json({ claims });
  }
});
