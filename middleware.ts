import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

// Routes qui nécessitent d'être connecté (correspondance par startsWith)
const PROTECTED_ROUTES = ["/dashboard", "/onboarding"];

// Routes accessibles uniquement aux non-connectés (correspondance exacte)
const AUTH_ONLY_ROUTES = ["/auth/login", "/auth/register", "/"];

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Rediriger vers login si route protégée et non connecté
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rediriger vers dashboard si déjà connecté et sur une route auth
  // Note : /auth/reset-password est exclu (session de récupération de MDP)
  if (AUTH_ONLY_ROUTES.includes(pathname) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
