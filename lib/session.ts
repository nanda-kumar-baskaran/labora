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

  // Single call — getUser() validates the JWT server-side.
  // getSession() is NOT called separately (it's a redundant round-trip).
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Extract claims directly from the cookie token (no extra round-trip).
  // The Supabase client already has the access_token in its cookie store.
  let tenant_id: string | null = null;
  let role: UserRole = "staff";
  let full_name: string | null = null;

  try {
    // Access the session from the already-authenticated client (no network call)
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (authSession?.access_token) {
      const parts = authSession.access_token.split(".");
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        tenant_id = payload?.tenant_id ?? null;
        role = (payload?.app_role as UserRole) ?? (payload?.role as UserRole) ?? "staff";
        full_name = payload?.full_name ?? null;
      }
    }
  } catch { /* fall through to DB lookup */ }

  // If JWT has tenant_id, we only need full_name from DB (if not in JWT).
  // If JWT is missing tenant_id (first login before hook fires), fetch both.
  if (tenant_id && full_name) {
    // Everything in JWT — zero DB calls needed
    return { id: user.id, email: user.email ?? "", tenant_id, role, full_name };
  }

  // Single DB call fetches everything we might need
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
    tenant_id: tenant_id ?? profile?.tenant_id ?? "",
    role: role ?? (profile?.role as UserRole) ?? "staff",
    full_name: full_name ?? profile?.full_name ?? user.email ?? "",
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
