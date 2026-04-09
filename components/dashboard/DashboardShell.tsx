"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardIconName =
  | "home"
  | "user"
  | "briefcase"
  | "calendar"
  | "clipboard"
  | "credit-card"
  | "search"
  | "map-pin"
  | "bell";

export interface NavItem {
  href: string;
  label: string;
  icon: DashboardIconName;
  exact?: boolean;
  badge?: string;
  disabled?: boolean;
}

export interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userEmail: string;
  userPhotoUrl?: string | null;
  userName?: string | null;
  role: "artisan" | "client";
}

// ─── Icônes SVG ───────────────────────────────────────────────────────────────

function Icon({
  name,
  className = "w-5 h-5",
}: {
  name: DashboardIconName;
  className?: string;
}) {
  const icons: Record<DashboardIconName, React.ReactNode> = {
    home: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    user: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    briefcase: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    calendar: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    clipboard: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    "credit-card": (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    search: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    "map-pin": (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bell: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  };
  return <>{icons[name]}</>;
}

// ─── Lien de navigation (sidebar) ─────────────────────────────────────────────

function SidebarNavLink({ href, label, icon, exact = false, badge, disabled }: NavItem) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed select-none">
        <span className="flex-shrink-0 text-gray-300">
          <Icon name={icon} />
        </span>
        <span className="truncate flex-1">{label}</span>
        <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">
          Bientôt
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        isActive
          ? "bg-brand-600 text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span
        className={`flex-shrink-0 transition-colors ${
          isActive
            ? "text-white"
            : "text-gray-400 group-hover:text-gray-600"
        }`}
      >
        <Icon name={icon} />
      </span>
      <span className="truncate flex-1">{label}</span>
      {badge && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
            isActive
              ? "bg-white/20 text-white"
              : "bg-brand-100 text-brand-700"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DashboardShell({
  children,
  navItems,
  userEmail,
  userPhotoUrl,
  userName,
  role,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  const roleMeta =
    role === "artisan"
      ? { label: "artisan", color: "bg-brand-600", pillClass: "bg-brand-50 text-brand-700 ring-1 ring-brand-200" }
      : { label: "Client", color: "bg-blue-600", pillClass: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ═══════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-16">
        <div className="flex h-full items-center gap-3 px-4">

          {/* Hamburger — mobile seulement */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold leading-none">M</span>
            </div>
            <span className="hidden sm:block font-semibold text-gray-900 text-sm tracking-tight">
              Manobra
            </span>
          </Link>

          {/* Séparateur */}
          <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />

          {/* Badge rôle */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleMeta.pillClass}`}
          >
            {roleMeta.label}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Email */}
          <span className="hidden lg:block text-sm text-gray-500 truncate max-w-[180px]">
            {userEmail}
          </span>

          {/* Avatar */}
          <div
            className={`relative w-9 h-9 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-offset-1 ${
              role === "artisan" ? "ring-brand-200" : "ring-blue-200"
            }`}
          >
            {userPhotoUrl ? (
              <Image
                src={userPhotoUrl}
                alt={userName ?? userEmail}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className={`w-full h-full ${roleMeta.color} flex items-center justify-center`}
              >
                <span className="text-xs font-bold text-white tracking-wide">
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Bouton déconnexion */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          BODY (sidebar + contenu)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-16 z-30 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
        <aside
          className={[
            "fixed top-16 left-0 z-30 h-[calc(100vh-4rem)]",
            "w-64 flex-shrink-0",
            "bg-white border-r border-gray-200",
            "flex flex-col",
            "transition-transform duration-200 ease-in-out",
            "lg:sticky lg:translate-x-0",
            sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
          ].join(" ")}
        >
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {navItems.map((item) => (
              <SidebarNavLink key={item.href} {...item} />
            ))}
          </nav>

          {/* Pied de sidebar — infos utilisateur */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
              <div
                className={`relative w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ring-2 ${
                  role === "artisan" ? "ring-brand-200" : "ring-blue-200"
                }`}
              >
                {userPhotoUrl ? (
                  <Image
                    src={userPhotoUrl}
                    alt={userName ?? userEmail}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div
                    className={`w-full h-full ${roleMeta.color} flex items-center justify-center`}
                  >
                    <span className="text-[10px] font-bold text-white">{initials}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {userName && (
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {userName}
                  </p>
                )}
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── CONTENU PRINCIPAL ────────────────────────────────────── */}
        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
