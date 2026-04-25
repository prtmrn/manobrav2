"use client";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { METIER_LIST, METIER_CONFIG } from "@/components/map/metier-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterOverrides {
  metier?: string;
  ville?: string;
  lat?: string;
  lng?: string;
  rayon?: string;
  prixMax?: string;
  noteMin?: string;
  dispo?: boolean;
  vue?: "grille" | "carte";
}

interface SearchFiltersProps {
  initialMetier?: string;
  initialVille?: string;
  initialPrixMax?: string;
  initialNoteMin?: string;
  initialDispo?: string;
  initialVue: "grille" | "carte";
  allCities: string[];
  totalResults: number;
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-medium border border-brand-200">
      {label}
      <button
        onClick={onRemove}
        className="text-brand-400 hover:text-brand-700 transition-colors ml-0.5"
        aria-label="Supprimer ce filtre"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SearchFilters({
  initialMetier,
  initialVille,
  initialPrixMax,
  initialNoteMin,
  initialDispo,
  initialVue,
  allCities,
  totalResults,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // ── Local state ─────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [metier, setMetier] = useState(initialMetier ?? "");
  const [ville, setVille] = useState(initialVille ?? "");
  const [clientLat, setClientLat] = useState("");
  const [clientLng, setClientLng] = useState("");
  const [rayon, setRayon] = useState("20");
  const [adresseLabel, setAdresseLabel] = useState(initialVille ?? "");
  const [prixMax, setPrixMax] = useState(initialPrixMax ?? "");
  const [noteMin, setNoteMin] = useState(initialNoteMin ?? "0");
  const [dispo, setDispo] = useState(initialDispo === "true");
  const [dispoMode, setDispoMode] = useState("");
  const [dispoDate, setDispoDate] = useState("");
  const [vue, setVue] = useState<"grille" | "carte">(initialVue);

  // ── URL push ─────────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (overrides: FilterOverrides = {}) => {
      const m = overrides.metier !== undefined ? overrides.metier : metier;
      const v = overrides.ville !== undefined ? overrides.ville : ville;
      const pm = overrides.prixMax !== undefined ? overrides.prixMax : prixMax;
      const nm = overrides.noteMin !== undefined ? overrides.noteMin : noteMin;
      const d = overrides.dispo !== undefined ? overrides.dispo : dispo;
      const vu = overrides.vue !== undefined ? overrides.vue : vue;

      const lat = overrides.lat !== undefined ? overrides.lat : clientLat;
      const lng = overrides.lng !== undefined ? overrides.lng : clientLng;
      const r = overrides.rayon !== undefined ? overrides.rayon : rayon;
      const qs = new URLSearchParams();
      if (m) qs.set("metier", m);
      if (v.trim()) qs.set("ville", v.trim());
      if (lat) { qs.set("lat", lat); qs.set("lng", lng); qs.set("rayon", r); }
      if (pm) qs.set("prix_max", pm);
      if (nm && nm !== "0") qs.set("note_min", nm);
      if (d) qs.set("dispo", "true");
      if (vu !== "grille") qs.set("vue", vu);
      // Always reset to page 1 on filter change

      startTransition(() => {
        router.push(`${pathname}?${qs.toString()}`);
      });
    },
    [metier, ville, prixMax, noteMin, dispo, vue, pathname, router, clientLat, clientLng, rayon]
  );

  const resetFilters = () => {
    setMetier("");
    setVille("");
    setClientLat("");
    setClientLng("");
    setRayon("20");
    setAdresseLabel("");
    setPrixMax("");
    setNoteMin("0");
    setDispo(false);
    setVue("grille");
    startTransition(() => router.push(pathname));
  };

  const hasActiveFilters = !!(
    metier ||
    ville ||
    prixMax ||
    (noteMin && noteMin !== "0") ||
    dispo
  );

  const activeCount = [
    metier,
    ville,
    prixMax,
    noteMin && noteMin !== "0" ? noteMin : "",
    dispo ? "dispo" : "",
  ].filter(Boolean).length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={`transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>

      {/* ── Search bar row ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2">

        {/* Adresse input */}
        <div className="flex-1 min-w-0 relative">
          <AddressAutocomplete
            value={adresseLabel}
            placeholder="Votre adresse..."
            inputClass="w-full pl-4 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            onChange={(result) => {
              setAdresseLabel(result.adresse + (result.ville ? ", " + result.ville : ""));
              setVille(result.ville);
              setClientLat(String(result.latitude));
              setClientLng(String(result.longitude));
              applyFilters({ ville: result.ville, lat: String(result.latitude), lng: String(result.longitude) });
            }}
          />
        </div>

        {/* Slider distance inline */}
        {clientLat && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <input
              type="range"
              min="1"
              max="49"
              step="1"
              value={rayon}
              onChange={(e) => {
                setRayon(e.target.value);
                applyFilters({ lat: clientLat, lng: clientLng, rayon: e.target.value });
              }}
              className="flex-1 accent-brand-600"
            />
            <span className="text-xs font-semibold text-brand-600 whitespace-nowrap">
              {parseInt(rayon) >= 49 ? "50+ km" : `${rayon} km`}
            </span>
          </div>
        )}
        {/* Métier quick select (visible on sm+) */}
        <div className="hidden sm:block w-44">
          <select
            value={metier}
            onChange={(e) => {
              setMetier(e.target.value);
              applyFilters({ metier: e.target.value });
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Tous les métiers</option>
            {METIER_LIST.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Advanced filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors shadow-sm ${
            hasActiveFilters
              ? "border-brand-400 bg-brand-50 text-brand-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 5a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zm4 5a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1z" />
          </svg>
          <span className="hidden sm:inline">Filtres</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {/* Search button */}
        <button
          onClick={() => applyFilters()}
          className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
        >
          Rechercher
        </button>

        {/* View toggle */}
        <button
          onClick={() => {
            const newVue = vue === "carte" ? "grille" : "carte";
            setVue(newVue);
            applyFilters({ vue: newVue });
          }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {vue === "carte" ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="hidden sm:inline">Afficher la liste</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="hidden sm:inline">Afficher la carte</span>
            </>
          )}
        </button>

      </div>
      {/* ── Advanced filter panel ─────────────────────────────────────────── */}
      {showFilters && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Métier (visible on mobile, hidden on sm where it's in the bar) */}
            <div className="sm:hidden">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Métier
              </label>
              <select
                value={metier}
                onChange={(e) => setMetier(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">Tous les métiers</option>
                {METIER_LIST.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Prix max slider */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Prix max :{" "}
                <span className="text-gray-700 normal-case font-bold">
                  {prixMax ? `${prixMax} €` : "Illimité"}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={500}
                step={10}
                value={prixMax || 500}
                onChange={(e) => {
                  const v = e.target.value;
                  setPrixMax(v === "500" ? "" : v);
                }}
                className="w-full h-2 accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 €</span>
                <span>500 € +</span>
              </div>
            </div>

            {/* Note minimum */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Note minimum
              </label>
              <div className="flex gap-1">
                {[
                  { value: "0", label: "Tous" },
                  { value: "3", label: "3★+" },
                  { value: "4", label: "4★+" },
                  { value: "4.5", label: "4.5★+" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setNoteMin(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      noteMin === value || (!noteMin && value === "0")
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Disponibilité */}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Disponibilité
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Aujourd'hui", value: "today" },
                    { label: "Demain", value: "tomorrow" },
                    { label: "Cette semaine", value: "week" },
                    { label: "Ce week-end", value: "weekend" },
                  ].map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const newDispo = dispoMode === value ? false : true;
                        setDispoMode(dispoMode === value ? "" : value);
                        setDispo(newDispo);
                        applyFilters({ dispo: newDispo });
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        dispoMode === value
                          ? "bg-brand-600 text-white border-brand-600"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={dispoDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setDispoDate(e.target.value);
                    setDispoMode("");
                    setDispo(!!e.target.value);
                    applyFilters({ dispo: !!e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Mobile view toggle */}
            <div className="sm:hidden">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Affichage
              </label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setVue("grille")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                    vue === "grille" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grille
                </button>
                <button
                  onClick={() => setVue("carte")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium border-l border-gray-100 transition-colors ${
                    vue === "carte" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Carte
                </button>
              </div>
            </div>

          </div>

          {/* Apply / Reset row */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
            <button
              onClick={resetFilters}
              className={`text-sm font-medium transition-colors ${
                hasActiveFilters
                  ? "text-red-500 hover:text-red-700"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              disabled={!hasActiveFilters}
            >
              Réinitialiser
            </button>
            <button
              onClick={() => {
                applyFilters();
                setShowFilters(false);
              }}
              className="px-6 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
            >
              Voir {totalResults} résultat{totalResults !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* ── Active filter chips ───────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {metier && (
            <FilterChip
              label={metier}
              onRemove={() => {
                setMetier("");
                applyFilters({ metier: "" });
              }}
            />
          )}
          {ville && (
            <FilterChip
              label={`📍 ${ville}`}
              onRemove={() => {
                setVille("");
                setAdresseLabel("");
                setClientLat("");
                setClientLng("");
                const qs = new URLSearchParams(window.location.search);
                qs.delete("ville");
                qs.delete("lat");
                qs.delete("lng");
                qs.delete("rayon");
                applyFilters({ ville: "", lat: "", lng: "" });
              }}
            />
          )}
          {prixMax && (
            <FilterChip
              label={`≤ ${prixMax} €`}
              onRemove={() => {
                setPrixMax("");
                applyFilters({ prixMax: "" });
              }}
            />
          )}
          {noteMin && noteMin !== "0" && (
            <FilterChip
              label={`${noteMin}★ minimum`}
              onRemove={() => {
                setNoteMin("0");
                applyFilters({ noteMin: "0" });
              }}
            />
          )}
          {dispo && (
            <FilterChip
              label="📅 Disponible cette semaine"
              onRemove={() => {
                setDispo(false);
                applyFilters({ dispo: false });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
