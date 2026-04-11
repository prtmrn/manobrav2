import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  const isArtisanDomain = hostname.startsWith("artisan.");
  const isAdminDomain = hostname.startsWith("admin.");
  const isMainDomain = !isArtisanDomain && !isAdminDomain;

  // ── ADMIN.MANOBRA.FR ──────────────────────────────────────────────────────
  if (isAdminDomain) {
    // Non connecté → page de connexion admin
    if (!user && !pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    // Connecté → vérifier que c'est un admin
    if (user && !pathname.startsWith("/auth")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile as any)?.role;
      if (role !== "admin") {
        // Pas admin → déconnecter et rediriger vers login
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      // Admin connecté sur / → dashboard
      if (pathname === "/" || pathname === "") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // Réécriture /dashboard → /dashboard/admin
      if (pathname === "/dashboard" || pathname === "/dashboard/") {
        return NextResponse.rewrite(new URL("/dashboard/admin", request.url));
      }
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/admin")) {
        return NextResponse.rewrite(
          new URL(pathname.replace("/dashboard/", "/dashboard/admin/"), request.url)
        );
      }
    }
    return response;
  }

  // ── ARTISAN.MANOBRA.FR ────────────────────────────────────────────────────
  if (isArtisanDomain) {
    // Non connecté → page de connexion
    if (!user && !pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (user && !pathname.startsWith("/auth")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile as any)?.role;

      // Connecté client → déconnecter et rediriger vers login
      if (role === "client") {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }

      // Artisan connecté sur / → dashboard
      if (pathname === "/" || pathname === "") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Réécriture /dashboard → /dashboard/artisan
      if (pathname === "/dashboard" || pathname === "/dashboard/") {
        return NextResponse.rewrite(new URL("/dashboard/artisan", request.url));
      }
      if (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/artisan")) {
        return NextResponse.rewrite(
          new URL(pathname.replace("/dashboard/", "/dashboard/artisan/"), request.url)
        );
      }
    }
    return response;
  }

  // ── MANOBRA.FR (domaine principal) ───────────────────────────────────────
  if (isMainDomain) {
    const PROTECTED_ROUTES = ["/dashboard", "/onboarding"];
    const AUTH_ONLY_ROUTES = ["/auth/login", "/auth/register", "/"];

    // Routes protégées sans connexion → login
    if (PROTECTED_ROUTES.some(r => pathname.startsWith(r)) && !user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Connecté sur auth routes → rediriger vers dashboard selon rôle
    if (AUTH_ONLY_ROUTES.includes(pathname) && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile as any)?.role;
      // Sur manobra.fr, connecté → rester sur le site vitrine (pas de redirection)
      // Le bouton "Accéder à mon espace" est géré côté client dans NavbarLanding
      return response;
    }

    // Empêcher un client d'accéder à /dashboard/artisan sur manobra.fr
    if (pathname.startsWith("/dashboard/artisan") && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile as any)?.role;
      if (role === "client") {
        return NextResponse.redirect(new URL("/dashboard/client", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
