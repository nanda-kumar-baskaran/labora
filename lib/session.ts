import { UserRole } from "@/types";

export interface SessionUser {
  id: string;
  email: string;
  tenant_id: string;
  role: UserRole;
  full_name: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const mode = process.env.STORAGE_MODE ?? "cloud";

  if (mode === "local") {
    const { getLocalSession } = await import("@/lib/auth/local-auth");
    const local = await getLocalSession();
    if (!local) return null;
    return {
      id: local.userId,
      email: local.email,
      tenant_id: local.tenantId,
      role: local.role as UserRole,
      full_name: local.fullName,
    };
  }

  // Cloud mode: Supabase JWT
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: { session: authSession } } = await supabase.auth.getSession();
  let tenant_id: string | null = null;
  let role: UserRole = "staff";

  if (authSession?.access_token) {
    try {
      const parts = authSession.access_token.split(".");
      if (parts.length === 3 && parts[1]) {
        const jwtPayload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString()
        );
        tenant_id = jwtPayload?.tenant_id ?? null;
        // app_role is our custom claim (avoids conflict with Postgres role system)
        role = (jwtPayload?.app_role as UserRole) ?? (jwtPayload?.role as UserRole) ?? "staff";
      }
    } catch { /* ignore parse error — fallback to DB lookup below */ }
  }

  // Fallback to DB lookup if JWT claims not yet populated
  // Use admin client to bypass RLS (needed on first login before hook injects tenant_id)
  if (!tenant_id) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("tenant_id, role, full_name")
      .eq("id", user.id)
      .single();
    return {
      id: user.id,
      email: user.email ?? "",
      tenant_id: profile?.tenant_id ?? "",
      role: (profile?.role as UserRole) ?? "staff",
      full_name: profile?.full_name ?? user.email ?? "",
    };
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = await createAdminClient();
  const { data: profile } = await admin.from("users").select("full_name").eq("id", user.id).single();
  return {
    id: user.id,
    email: user.email ?? "",
    tenant_id,
    role,
    full_name: profile?.full_name ?? user.email ?? "",
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function hasRole(session: SessionUser, roles: UserRole[]): boolean {
  return roles.includes(session.role);
}
