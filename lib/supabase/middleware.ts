import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const mode = process.env.STORAGE_MODE ?? "cloud";

  // Public paths — always allowed
  const publicPaths = ["/login", "/r/", "/api/auth/login", "/api/auth/logout", "/api/r/", "/api/storage/", "/setup", "/api/setup", "/reset", "/api/admin/reset"];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  if (mode === "local") {
    const token = request.cookies.get("labms_local_session")?.value;
    const isAuthenticated = !!token;

    // Already authenticated — let through (except login page, redirect to dashboard)
    if (isAuthenticated) {
      if (pathname === "/login" || pathname === "/setup") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Not authenticated
    if (isPublic) return NextResponse.next();

    // Protected route — redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Cloud mode: Supabase session
  // Guard: if Supabase URL is a placeholder (running in local dev without cloud creds),
  // fall back to treating as unauthenticated — redirect to login for protected routes.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !supabaseKey || supabaseKey === "placeholder_anon_key") {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const { createServerClient } = await import("@supabase/ssr");
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch {
    // Supabase unreachable — redirect to login for protected routes
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }
  return supabaseResponse;
}
