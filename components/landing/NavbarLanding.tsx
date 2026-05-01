"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { METIER_LIST } from "@/components/map/metier-config";
import { SERVICES_STANDARDISES, normalizeStr } from "@/lib/services-standardises";

const NAV_LINKS = [
  { href: "/recherche", label: "Trouver un artisan" },
  { href: "/metiers", label: "Nos métiers" },
  { href: "/qui-sommes-nous", label: "Qui sommes-nous" },
  { href: "/blog", label: "Blog" },
];

type Suggestion =
  | { type: "service"; id: string; label: string; metier: string }
  | { type: "metier"; label: string }
  | { type: "ville"; label: string; lat: number; lng: number }
  | { type: "artisan"; id: string; label: string; metier: string | null };

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function NavbarLanding() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const pathname = usePathname();
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle() as { data: { role: string } | null };
      setRole(profile?.role ?? null);
      setLoading(false);
    };
    check();
  }, []);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    async function fetch_(q: string) {
      if (q.length < 2) { setSuggestions([]); return; }
      const norm = normalizeStr(q);
      const results: Suggestion[] = [];

      SERVICES_STANDARDISES.filter(s => normalizeStr(s.label).includes(norm)).slice(0, 4)
        .forEach(s => results.push({ type: "service", id: s.id, label: s.label, metier: s.metier }));

      METIER_LIST.filter(m => normalizeStr(m).includes(norm)).slice(0, 2)
        .forEach(m => results.push({ type: "metier", label: m }));

      try {
        const supabase = createClient();
        const { data } = await supabase.from("profiles_artisans").select("id, nom, prenom, metier")
          .eq("actif", true).or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`).limit(3);
        if (data) (data as any[]).forEach(a => results.push({
          type: "artisan", id: a.id,
          label: `${a.prenom ?? ""} ${a.nom ?? ""}`.trim(),
          metier: Array.isArray(a.metier) ? a.metier[0] : a.metier,
        }));
      } catch {}

      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=3`);
        const json = await res.json();
        (json.features ?? []).forEach((f: any) => results.push({
          type: "ville", label: f.properties.label,
          lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
        }));
      } catch {}

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }
    fetch_(debouncedQuery);
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function selectSuggestion(s: Suggestion) {
    setShowSuggestions(false);
    setQuery("");
    if (s.type === "service") router.push(`/recherche?service=${s.id}`);
    else if (s.type === "metier") router.push(`/recherche?metier=${encodeURIComponent(s.label)}`);
    else if (s.type === "ville") router.push(`/recherche?lat=${s.lat}&lng=${s.lng}&rayon=10`);
    else if (s.type === "artisan") router.push(`/prestataires/${s.id}`);
  }

  function handleSubmit() {
    if (suggestions.length > 0 && activeIndex >= 0) { selectSuggestion(suggestions[activeIndex]); return; }
    const norm = normalizeStr(query);
    const metierMatch = METIER_LIST.find(m => normalizeStr(m).includes(norm));
    if (metierMatch) { router.push(`/recherche?metier=${encodeURIComponent(metierMatch)}`); return; }
    const serviceMatch = SERVICES_STANDARDISES.find(s => normalizeStr(s.label).includes(norm));
    if (serviceMatch) { router.push(`/recherche?service=${serviceMatch.id}`); return; }
    router.push(`/recherche?q=${encodeURIComponent(query)}`);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)); }
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") setShowSuggestions(false);
  }

  const grouped = [
    { label: "Services", items: suggestions.filter(s => s.type === "service") },
    { label: "Métiers", items: suggestions.filter(s => s.type === "metier") },
    { label: "Artisans", items: suggestions.filter(s => s.type === "artisan") },
    { label: "Villes", items: suggestions.filter(s => s.type === "ville") },
  ].filter(g => g.items.length > 0);

  let globalIndex = -1;

  return (
    <>
      {/* Barre de recherche desktop */}
      <div className="hidden md:flex flex-1 mx-6 relative" ref={wrapperRef}>
        <div className="relative w-full max-w-md">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(-1); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onClick={e => e.stopPropagation()}
            placeholder="Plombier, débouchage, Paris..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[320px]">
              {grouped.map(group => {
                return (
                  <div key={group.label}>
                    <div className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                      {group.label}
                    </div>
                    {group.items.map(s => {
                      globalIndex++;
                      const idx = globalIndex;
                      return (
                        <button
                          key={s.type + ("id" in s ? s.id : s.label)}
                          onMouseDown={() => selectSuggestion(s)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                            activeIndex === idx ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex-1 truncate">{s.label}</span>
                          {"metier" in s && s.metier && (
                            <span className="text-xs text-gray-400 flex-shrink-0">{s.metier}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Nav links desktop */}
      <nav className="hidden md:flex items-center gap-5">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              pathname.startsWith(href) ? "text-brand-600" : "text-gray-600 hover:text-gray-900"
            }`}>
            {label}
          </Link>
        ))}
      </nav>

      {/* Auth buttons desktop */}
      <div className="hidden md:flex items-center gap-3 ml-4">
        {loading ? (
          <div className="w-24 h-8 bg-gray-100 rounded-xl animate-pulse" />
        ) : role ? (
          <Link href="/dashboard"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
            Mon espace →
          </Link>
        ) : (
          <>
            <Link href="/auth/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Connexion
            </Link>
            <Link href="/commencer"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              Commencer →
            </Link>
          </>
        )}
      </div>

      {/* Mobile : loupe + hamburger */}
      <div className="md:hidden flex items-center gap-2 ml-auto">
        <button
          onClick={() => { setSearchOpen(o => !o); setMenuOpen(false); }}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Rechercher"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button
          onClick={() => { setMenuOpen(o => !o); setSearchOpen(false); }}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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

      {/* Barre de recherche mobile */}
      {searchOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg z-50 px-4 py-3" ref={wrapperRef}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIndex(-1); setShowSuggestions(true); }}
              onKeyDown={handleKeyDown}
              placeholder="Plombier, débouchage, Paris..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              autoComplete="off"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
              {grouped.map(group => (
                <div key={group.label}>
                  <div className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    {group.label}
                  </div>
                  {group.items.map(s => (
                    <button
                      key={s.type + ("id" in s ? s.id : s.label)}
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex-1 truncate">{s.label}</span>
                      {"metier" in s && s.metier && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{s.metier}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg z-50 px-4 py-3 space-y-1">
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
            {role && (
              <Link href="/dashboard"
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-brand-600 hover:bg-brand-50">
                Mon espace →
              </Link>
            )}
            <Link href="https://artisan.manobra.fr/auth/login"
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50">
              Espace artisan →
            </Link>
            {!role && (
              <Link href="/commencer"
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 text-center mt-1">
                Commencer →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
