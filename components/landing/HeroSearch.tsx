"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { METIER_LIST } from "@/components/map/metier-config";
import { SERVICES_STANDARDISES, normalizeStr } from "@/lib/services-standardises";
import { createClient } from "@/lib/supabase/client";

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

export default function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const norm = normalizeStr(q);
    const results: Suggestion[] = [];

    // Services
    const services = SERVICES_STANDARDISES
      .filter(s => normalizeStr(s.label).includes(norm))
      .slice(0, 4)
      .map(s => ({ type: "service" as const, id: s.id, label: s.label, metier: s.metier }));
    results.push(...services);

    // Métiers
    const metiers = METIER_LIST
      .filter(m => normalizeStr(m).includes(norm))
      .slice(0, 2)
      .map(m => ({ type: "metier" as const, label: m }));
    results.push(...metiers);

    // Artisans (Supabase)
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles_artisans")
        .select("id, nom, prenom, metier")
        .eq("actif", true)
        .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
        .limit(3);
      if (data) {
        const artisans = data.map((a: any) => ({
          type: "artisan" as const,
          id: a.id,
          label: `${a.prenom ?? ""} ${a.nom ?? ""}`.trim(),
          metier: Array.isArray(a.metier) ? a.metier[0] : a.metier,
        }));
        results.push(...artisans);
      }
    } catch {}

    // Villes (API adresse.data.gouv.fr)
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=3`
      );
      const json = await res.json();
      const villes = (json.features ?? []).map((f: any) => ({
        type: "ville" as const,
        label: f.properties.label,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }));
      results.push(...villes);
    } catch {}

    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  }, []);

  useEffect(() => { fetchSuggestions(debouncedQuery); }, [debouncedQuery, fetchSuggestions]);

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
    if (s.type === "service") {
      router.push(`/recherche?service=${s.id}`);
    } else if (s.type === "metier") {
      router.push(`/recherche?metier=${encodeURIComponent(s.label)}`);
    } else if (s.type === "ville") {
      router.push(`/recherche?lat=${s.lat}&lng=${s.lng}&rayon=10`);
    } else if (s.type === "artisan") {
      router.push(`/prestataires/${s.id}`);
    }
  }

  function handleSubmit() {
    if (suggestions.length > 0 && activeIndex >= 0) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    // Fallback : chercher par texte libre
    const norm = normalizeStr(query);
    const metierMatch = METIER_LIST.find(m => normalizeStr(m).includes(norm));
    if (metierMatch) { router.push(`/recherche?metier=${encodeURIComponent(metierMatch)}`); return; }
    const serviceMatch = SERVICES_STANDARDISES.find(s => normalizeStr(s.label).includes(norm));
    if (serviceMatch) { router.push(`/recherche?service=${serviceMatch.id}`); return; }
    router.push(`/recherche?q=${encodeURIComponent(query)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)); }
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") setShowSuggestions(false);
  }

  const iconFor = (type: Suggestion["type"]) => {
    if (type === "service") return (
      <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
    if (type === "metier") return (
      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
    if (type === "artisan") return (
      <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  };

  const labelFor = (type: Suggestion["type"]) => {
    if (type === "service") return "Service";
    if (type === "metier") return "Métier";
    if (type === "artisan") return "Artisan";
    return "Ville";
  };

  const grouped = [
    { label: "Services", items: suggestions.filter(s => s.type === "service") },
    { label: "Métiers", items: suggestions.filter(s => s.type === "metier") },
    { label: "Artisans", items: suggestions.filter(s => s.type === "artisan") },
    { label: "Villes", items: suggestions.filter(s => s.type === "ville") },
  ].filter(g => g.items.length > 0);

  let globalIndex = -1;

  return (
    <div className="w-full max-w-2xl mx-auto mb-14" ref={wrapperRef}>
      <div className="relative flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(-1); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onClick={e => e.stopPropagation()}
            placeholder="Plombier, débouchage, Paris..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {grouped.map(group => (
                <div key={group.label}>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
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
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                          activeIndex === idx ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {iconFor(s.type)}
                        <span className="flex-1 truncate">{s.label}</span>
                        {"metier" in s && s.metier && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{s.metier}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleSubmit}
          className="flex-shrink-0 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-4 rounded-2xl text-base transition-all duration-200 shadow-lg shadow-brand-200 hover:shadow-brand-300 hover:-translate-y-0.5 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline">Rechercher</span>
        </button>
      </div>
    </div>
  );
}
