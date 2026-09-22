import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readImpersonationCookies, resolveEffectiveRole } from "@/lib/auth/role";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/signup") &&
    !request.nextUrl.pathname.startsWith("/setup") &&
    !request.nextUrl.pathname.startsWith("/api")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const imp = readImpersonationCookies((name) => request.cookies.get(name)?.value);
      const role = resolveEffectiveRole(profile.role, imp.from, imp.role);
      const pathname = request.nextUrl.pathname;

      const roleRoutes: Record<string, string[]> = {
        super_admin: ["/super-admin"],
        admin: ["/admin"],
        doctor: ["/doctor"],
        nurse: ["/nurse"],
        lab: ["/lab"],
        staff: ["/staff"],
        patient: ["/patient"],
      };

      const allowedPrefixes = roleRoutes[role] || [];
      const isAllowed =
        allowedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
        pathname.startsWith("/profile");

      if (!isAllowed && pathname !== "/login" && !pathname.startsWith("/api")) {
        const url = request.nextUrl.clone();
        url.pathname = allowedPrefixes[0] || "/login";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
