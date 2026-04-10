"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/recherche", label: "Trouver un pro" },
  { href: "/metiers", label: "Nos métiers" },
  { href: "/qui-sommes-nous", label: "Qui sommes-nous" },
  { href: "/blog", label: "Blog" },
];

export default function NavbarLanding() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle() as { data: { role: string } | null };
      setRole(profile?.role ?? null);
      setLoading(false);
    };
    check();
  }, []);

  // Fermer le menu quand on change de page
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      {/* ── DESKTOP & MOBILE HEADER ── */}
      <div className="flex items-center gap-6 w-full">

        {/* Nav links desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? "text-brand-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Espace artisan — discret, desktop */}
        <Link href="https://artisan.manobra.fr/auth/login"
          className="hidden md:inline text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
          Espace artisan →
        </Link>

        {/* Auth buttons */}
        {loading ? (
          <div className="w-24 h-8 bg-gray-100 rounded-xl animate-pulse" />
        ) : role ? (
          <Link
            href={role === "artisan" ? "/dashboard/artisan" : role === "admin" ? "/dashboard/admin" : "/dashboard/client"}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            Mon espace
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login"
              className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Connexion
            </Link>
            <Link href="/commencer"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              Commencer
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Hamburger mobile */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── MENU MOBILE ── */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg z-50 px-4 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              {label}
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
            {!role && (
              <Link href="/auth/login"
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Connexion
              </Link>
            )}
            <Link href="https://artisan.manobra.fr/auth/login"
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50">
              Espace artisan →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
