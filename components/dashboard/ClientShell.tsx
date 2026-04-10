"use client";

import Link from "next/link";
import { usePathname, useRouter, useSelectedLayoutSegment } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";

interface ClientShellProps {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
}

export default function ClientShell({ children, userEmail, userName }: ClientShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showFab, setShowFab] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const cta = document.getElementById("cta-top");
    if (!cta) { setShowFab(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => setShowFab(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(cta);
    return () => observer.disconnect();
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  const navLinks = [
    { href: "/dashboard/client", label: "Accueil", exact: true },
    { href: "/dashboard/client/reservations", label: "Mes réservations" },
    { href: "/dashboard/client/profil", label: "Mon profil" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── NAVBAR ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="font-bold text-gray-900 text-base tracking-tight flex-shrink-0">
            Man<span className="text-green-600">obra</span>
          </Link>

          {/* Nav liens — desktop */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ href, label, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Droite : CTA + avatar + déco */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/recherche"
              className="hidden sm:inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Trouver un artisan
            </Link>

            {/* Avatar + déconnexion */}
            <div className="relative flex items-center gap-2" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <span className="text-xs font-bold text-white">{initials}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors hidden sm:block"
              >
                Déconnexion
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 truncate">{userEmail}</div>
                  <Link href="/dashboard/client/profil" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    Mon profil
                  </Link>
                  <Link href="/dashboard/client/reservations" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    Mes réservations
                  </Link>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav mobile — barre du bas */}
        <nav className="sm:hidden flex border-t border-gray-100">
          {navLinks.map(({ href, label, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 text-center py-2 text-xs font-medium transition-colors ${
                  isActive ? "text-green-600 border-b-2 border-green-600" : "text-gray-400"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── CONTENU ── */}
      <main className="max-w-4xl mx-auto">
        {children}
      </main>

      {/* ── CTA MOBILE FLOTTANT — visible seulement quand le CTA du haut est hors écran ── */}
      {showFab && (
        <Link
          href="/recherche"
          className="sm:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50
                     inline-flex items-center gap-2
                     bg-green-600 hover:bg-green-700 text-white font-bold text-sm
                     px-6 py-3.5 rounded-full shadow-lg shadow-green-200/60
                     transition-all duration-150 animate-fade-in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Trouver un artisan
        </Link>
      )}

    </div>
  );
}
