"use client";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useCallback, useRef, useEffect } from "react";
import { METIER_LIST, METIER_CONFIG } from "@/components/map/metier-config";
import { SERVICES_STANDARDISES } from "@/lib/services-standardises";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterOverrides {
  metier?: string;
  ville?: string;
  lat?: string;
  lng?: string;
  rayon?: string;
  adresse?: string;
  prixMax?: string;
  noteMin?: string;
  dispo?: boolean;
  vue?: "grille" | "carte";
  tri?: string;
  ordre?: string;
  serviceTag?: string;
  repondVite?: boolean;
  dispoMaintenant?: boolean;
}

interface SearchFiltersProps {
  initialMetier?: string;
  initialVille?: string;
  initialAdresse?: string;
  initialTri?: string;
  initialOrdre?: string;
  initialServiceTag?: string;
  initialRepondVite?: boolean;
  initialDispoMaintenant?: boolean;
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
  initialAdresse,
  initialTri,
  initialOrdre,
  initialServiceTag,
  initialRepondVite,
  initialDispoMaintenant,
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
  const [adresseLabel, setAdresseLabel] = useState(initialAdresse ?? initialVille ?? "");
  const [prixMax, setPrixMax] = useState(initialPrixMax ?? "");
  const [noteMin, setNoteMin] = useState(initialNoteMin ?? "0");
  const [dispo, setDispo] = useState(initialDispo === "true");
  const [dispoMode, setDispoMode] = useState("");
  const [dispoDate, setDispoDate] = useState("");
  const [serviceTag, setServiceTag] = useState(initialServiceTag ?? "");
  const [repondVite, setRepondVite] = useState(initialRepondVite ?? false);
  const [dispoMaintenant, setDispoMaintenant] = useState(initialDispoMaintenant ?? false);
  const [showServices, setShowServices] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const [tri, setTri] = useState(initialTri ?? "pertinence");
  const [showTri, setShowTri] = useState(false);
  const triRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showTri) return;
    function handle(e: MouseEvent) {
      if (triRef.current && !triRef.current.contains(e.target as Node)) setShowTri(false);
    }
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, [showTri]);
  const triLabels: Record<string, string> = { pertinence: "Pertinence", note: "Note", prix: "Prix", distance: "Distance" };
  const triLabel = triLabels[tri] ?? "Pertinence";
  const [ordre, setOrdre] = useState(initialOrdre ?? "desc");
  const [vue, setVue] = useState<"grille" | "carte">(initialVue);
  // Refs pour capturer les valeurs courantes dans applyFilters
  const stateRef = useRef({ metier, ville, prixMax, noteMin, dispo, vue, clientLat, clientLng, rayon, tri, ordre, adresseLabel, serviceTag, repondVite, dispoMaintenant });
  useEffect(() => {
    stateRef.current = { metier, ville, prixMax, noteMin, dispo, vue, clientLat, clientLng, rayon, tri, ordre, adresseLabel, serviceTag, repondVite, dispoMaintenant };
  });

  // ── URL push ─────────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (overrides: FilterOverrides = {}) => {
      const cur = stateRef.current;
      const m = overrides.metier !== undefined ? overrides.metier : cur.metier;
      const v = overrides.ville !== undefined ? overrides.ville : cur.ville;
      const pm = overrides.prixMax !== undefined ? overrides.prixMax : cur.prixMax;
      const nm = overrides.noteMin !== undefined ? overrides.noteMin : cur.noteMin;
      const d = overrides.dispo !== undefined ? overrides.dispo : cur.dispo;
      const vu = overrides.vue !== undefined ? overrides.vue : cur.vue;

      const lat = overrides.lat !== undefined ? overrides.lat : cur.clientLat;
      const lng = overrides.lng !== undefined ? overrides.lng : cur.clientLng;
      const r = overrides.rayon !== undefined ? overrides.rayon : cur.rayon;
      const qs = new URLSearchParams();
      if (m) qs.set("metier", m);
      if (lat) { qs.set("lat", lat); qs.set("lng", lng); qs.set("rayon", r); const al = overrides.adresse !== undefined ? overrides.adresse : adresseLabel; if (al) qs.set("adresse", al); }
      else if (v.trim()) qs.set("ville", v.trim());
      if (pm) qs.set("prix_max", pm);
      if (nm && nm !== "0") qs.set("note_min", nm);
      if (d) qs.set("dispo", "true");
      if (vu !== "grille") qs.set("vue", vu);
      const t = overrides.tri !== undefined ? overrides.tri : cur.tri;
      const o = overrides.ordre !== undefined ? overrides.ordre : cur.ordre;
      if (t && t !== "pertinence") qs.set("tri", t);
      if (o && o !== "desc") qs.set("ordre", o);
      const st = overrides.serviceTag !== undefined ? overrides.serviceTag : cur.serviceTag;
      if (st) qs.set("service", st);
      const rv = overrides.repondVite !== undefined ? overrides.repondVite : cur.repondVite;
      if (rv) qs.set("repond_vite", "true");
      const dm = overrides.dispoMaintenant !== undefined ? overrides.dispoMaintenant : cur.dispoMaintenant;
      if (dm) qs.set("dispo_maintenant", "true");
      // Always reset to page 1 on filter change

      startTransition(() => {
        router.push(`${pathname}?${qs.toString()}`);
      });
    },
    [pathname, router]
  );

  const resetFilters = () => {
    setMetier("");
    setVille("");
    setClientLat("");
    setClientLng("");
    setRayon("20");
    setAdresseLabel("");
    setTri("note");
    setOrdre("desc");
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
    <div className={`transition-opacity duration-200 ${isPending ? "opacity-50" : ""}`}>

      {/* ── Ligne adresse ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-2">
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
              stateRef.current.clientLat = String(result.latitude);
              stateRef.current.clientLng = String(result.longitude);
              applyFilters({ ville: result.ville, lat: String(result.latitude), lng: String(result.longitude) });
            }}
          />
        </div>
        {clientLat && (
          <div className="flex items-center gap-2 min-w-[130px]">
            <input
              type="range" min="1" max="49" step="1" value={rayon}
              onChange={(e) => { setRayon(e.target.value); applyFilters({ lat: clientLat, lng: clientLng, rayon: e.target.value }); }}
              className="flex-1 accent-brand-600"
            />
            <span className="text-xs font-semibold text-brand-600 whitespace-nowrap">
              {parseInt(rayon) >= 49 ? "50 km" : `${rayon} km`}
            </span>
          </div>
        )}
        {/* Toggle Liste/Carte */}
        <div className="flex-shrink-0 flex items-center">
          <div className="flex rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => { setVue("grille"); applyFilters({ vue: "grille" }); }}
              className={`flex items-center gap-1 px-2.5 py-2 text-xs font-semibold transition-colors ${
                vue === "grille" ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="hidden sm:inline">Liste</span>
            </button>
            <button
              onClick={() => { setVue("carte"); applyFilters({ vue: "carte" }); }}
              className={`flex items-center gap-1 px-2.5 py-2 text-xs font-semibold transition-colors border-l border-gray-200 ${
                vue === "carte" ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="hidden sm:inline">Carte</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Ligne filtres ─────────────────────────────────────────────────── */}
      <div className="flex flex-nowrap gap-2 overflow-visible">
        {/* Métier */}
        <div className="flex-shrink-0 w-36 sm:w-40">
          <select
            value={metier}
            onChange={(e) => {
              setMetier(e.target.value);
              setServiceTag("");
              stateRef.current.serviceTag = "";
              applyFilters({ metier: e.target.value, serviceTag: "" });
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Tous les métiers</option>
            {METIER_LIST.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Services */}
        <div className="relative flex-shrink-0 w-40 sm:w-48">
          <button
            onClick={() => { const next = !showServices; console.log("services click, showServices sera:", next); setShowServices(next); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm shadow-sm transition-colors ${
              serviceTag ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <span className="truncate">
              {SERVICES_STANDARDISES.find(s => s.id === serviceTag)?.label ?? "Tous les services"}
            </span>
            <svg className="w-4 h-4 flex-shrink-0 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showServices && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-72 max-h-80 overflow-y-auto py-1">
              <button
                onClick={() => { setServiceTag(""); stateRef.current.serviceTag = ""; applyFilters({ serviceTag: "" }); setShowServices(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${!serviceTag ? "text-brand-600 font-semibold bg-brand-50" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Tous les services
              </button>
              {METIER_LIST.map(m => {
                const svcs = SERVICES_STANDARDISES.filter(s => s.metier === m && (!metier || m === metier));
                if (svcs.length === 0) return null;
                return (
                  <div key={m}>
                    {!metier && (
                      <div className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide border-t border-gray-100 mt-1">
                        {m}
                      </div>
                    )}
                    {svcs.map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => { setServiceTag(svc.id); stateRef.current.serviceTag = svc.id; applyFilters({ serviceTag: svc.id }); setShowServices(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${serviceTag === svc.id ? "text-brand-600 font-semibold bg-brand-50" : "text-gray-700 hover:bg-gray-50"}`}
                      >
                        {svc.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filtres avancés */}
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

        {/* Dispo maintenant */}
        <button
          onClick={() => { const dm = !dispoMaintenant; setDispoMaintenant(dm); stateRef.current.dispoMaintenant = dm; applyFilters({ dispoMaintenant: dm }); }}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors shadow-sm whitespace-nowrap ${
            dispoMaintenant ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dispoMaintenant ? "bg-red-500 animate-pulse" : "bg-gray-300"}`} />
          <span className="hidden sm:inline">Dispo maintenant</span>
        </button>
        {/* Trier par */}
        <div className="relative" ref={triRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowTri(prev => !prev); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Trier par</span> {triLabel}
            {ordre === "asc" ? " ↑" : " ↓"}
          </button>
          {showTri && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px] py-1">
              {[
                { value: "pertinence", label: "Pertinence" },
                { value: "note", label: "Note" },
                ...(serviceTag ? [{ value: "prix", label: "Prix" }] : []),
                { value: "distance", label: "Distance" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    if (tri === value) {
                      const o = ordre === "desc" ? "asc" : "desc";
                      setOrdre(o);
                      stateRef.current.ordre = o;
                      applyFilters({ ordre: o });
                    } else {
                      setTri(value);
                      setOrdre("desc");
                      stateRef.current.tri = value;
                      stateRef.current.ordre = "desc";
                      applyFilters({ tri: value, ordre: "desc" });
                    }
                    setShowTri(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                    tri === value ? "text-brand-600 font-semibold bg-brand-50" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                  {tri === value && <span className="text-xs">{ordre === "desc" ? "↓" : "↑"}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Appliquer desktop */}
        <button
          onClick={() => applyFilters()}
          className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all shadow-sm sm:ml-auto"
        >
          Appliquer
        </button>
      </div>

      {/* Bouton flottant mobile */}
      <div className="sm:hidden fixed bottom-5 right-5 z-40">
        <button
          onClick={() => applyFilters()}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-600 text-white text-sm font-bold shadow-xl hover:bg-brand-700 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Appliquer
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
                {([
                  { value: "0", label: "Tous", stars: 0 },
                  { value: "3", label: "3+", stars: 3 },
                  { value: "4", label: "4+", stars: 4 },
                  { value: "4.5", label: "4.5+", stars: 5 },
                ] as { value: string; label: string; stars: number }[]).map(({ value, label, stars }) => (
                  <button
                    key={value}
                    onClick={() => setNoteMin(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-0.5 ${
                      noteMin === value || (!noteMin && value === "0")
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {stars > 0 ? (
                      <>
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{label}</span>
                      </>
                    ) : label}
                  </button>
                ))}
              </div>
            </div>

            {/* Répond vite */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Temps de réponse
              </label>
              <button
                onClick={() => { const rv = !repondVite; setRepondVite(rv); stateRef.current.repondVite = rv; applyFilters({ repondVite: rv }); }}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  repondVite ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Répond en moins de 2h
                {repondVite && <svg className="w-4 h-4 ml-auto text-brand-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </button>
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
