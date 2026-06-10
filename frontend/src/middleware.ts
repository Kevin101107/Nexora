import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/notes", "/focus", "/ai", "/flashcards", "/profile"];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Write the refreshed tokens back onto the request so downstream
          // server components see them, then onto supabaseResponse so the
          // browser receives the updated cookies.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create from the mutated request — do NOT discard the original
          // supabaseResponse here, reconstruct it so cookie writes accumulate.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with the Supabase server — never trust
  // getSession() alone in middleware as it only reads the local cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r));
  const isAuthPage  = AUTH_PAGES.some((r) => pathname === r);

  // Unauthenticated user hitting a protected route → send to login,
  // preserving where they wanted to go so we can redirect after sign-in.
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting a login/signup page → send to dashboard.
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Always return supabaseResponse so the refreshed session cookies are
  // forwarded to the browser. Never return a plain NextResponse.next() here.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on every path except Next.js internals and static assets.
     * Explicitly excludes _next/*, favicon, and common image extensions.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
