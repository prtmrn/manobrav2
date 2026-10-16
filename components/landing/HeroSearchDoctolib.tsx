"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { METIER_CONFIG, METIER_LIST } from "@/components/map/metier-config";

const METIERS = METIER_LIST.filter((m) => m !== "Autre");

type VilleSuggestion = { label: string; lat: number; lng: number };

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function HeroSearchDoctolib() {
  const router = useRouter();
  const [metier, setMetier] = useState("");
  const [ville, setVille] = useState("");
  const [villeSel, setVilleSel] = useState<VilleSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<VilleSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedVille = useDebounce(ville, 250);

  useEffect(() => {
    async function fetchVilles(q: string) {
      if (q.length < 2) { setSuggestions([]); return; }
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=5`
        );
        const json = await res.json();
        const villes = (json.features ?? []).map((f: { properties: { label: string }; geometry: { coordinates: number[] } }) => ({
          label: f.properties.label,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        }));
        setSuggestions(villes);
        setShowSuggestions(villes.length > 0);
      } catch {
        setSuggestions([]);
      }
    }
    fetchVilles(debouncedVille);
  }, [debouncedVille]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (metier) params.set("metier", metier);
    if (villeSel) {
      params.set("lat", String(villeSel.lat));
      params.set("lng", String(villeSel.lng));
      params.set("rayon", "10");
    } else if (ville.trim()) {
      params.set("ville", ville.trim());
    }
    router.push(`/recherche${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleAutourDeMoi() {
    if (!navigator.geolocation) {
      router.push("/recherche?vue=carte");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          rayon: "10",
        });
        if (metier) params.set("metier", metier);
        router.push(`/recherche?${params.toString()}`);
      },
      () => {
        setGeoLoading(false);
        router.push("/recherche?vue=carte");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row bg-white rounded-2xl sm:rounded-full border-2 border-gray-900 shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all overflow-visible"
      >
        {/* Sélecteur métier */}
        <div className="relative flex-1 flex items-center border-b sm:border-b-0 sm:border-r border-gray-200">
          <div className="absolute left-4 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <select
            value={metier}
            onChange={(e) => setMetier(e.target.value)}
            className={`w-full appearance-none bg-transparent pl-12 pr-8 py-4 text-base focus:outline-none cursor-pointer ${metier ? "text-gray-900" : "text-gray-400"}`}
          >
            <option value="" disabled>Quel métier ?</option>
            {METIERS.map((m) => (
              <option key={m} value={m} className="text-gray-900">
                {METIER_CONFIG[m].label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Champ ville avec suggestions */}
        <div className="relative flex-1 flex items-center" ref={wrapperRef}>
          <div className="absolute left-4 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={ville}
            onChange={(e) => { setVille(e.target.value); setVilleSel(null); }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Où ? (ex. Paris 11e)"
            className="w-full bg-transparent pl-12 pr-4 py-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onMouseDown={() => {
                    setVille(s.label);
                    setVilleSel(s);
                    setShowSuggestions(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="flex-1 truncate">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bouton rechercher */}
        <div className="p-2">
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3 rounded-full text-base transition-all duration-200 shadow-md hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Rechercher
          </button>
        </div>
      </form>

      {/* Autour de moi */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={handleAutourDeMoi}
          disabled={geoLoading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {geoLoading ? "Localisation en cours…" : "Autour de moi"}
        </button>
      </div>
    </div>
  );
}
