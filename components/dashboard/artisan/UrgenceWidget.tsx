"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UrgenceWidgetProps {
  urgenceActif: boolean;
  urgenceFin: string | null;
  urgenceSanctionFin: string | null;
  delaiEntreInterventions: number;
  artisanId: string;
}

export default function UrgenceWidget({
  urgenceActif: initialActif,
  urgenceFin: initialFin,
  urgenceSanctionFin,
  delaiEntreInterventions: initialDelai,
  artisanId,
}: UrgenceWidgetProps) {
  const router = useRouter();
  const [actif, setActif] = useState(initialActif);
  const [fin, setFin] = useState(initialFin);
  const [heureChoix, setHeureChoix] = useState("");
  const [delai, setDelai] = useState(initialDelai);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const isSanctioned = urgenceSanctionFin ? new Date(urgenceSanctionFin) > new Date() : false;
  const sanctionEnd = urgenceSanctionFin
    ? new Date(urgenceSanctionFin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  useEffect(() => {
    if (!actif || !fin) { setTimeLeft(""); return; }
    const update = () => {
      const diff = new Date(fin).getTime() - Date.now();
      if (diff <= 0) { setActif(false); setFin(null); setTimeLeft(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m} min`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [actif, fin]);

  async function toggleUrgence() {
    console.log("toggleUrgence called", { isSanctioned, actif, loading, showConfig });
    if (isSanctioned) return;
    if (actif) {
      setLoading(true);
      const supabase = createClient();
      // @ts-ignore
      await supabase.from("profiles_artisans").update({ urgence_actif: false, urgence_fin: null }).eq("id", artisanId);
      setActif(false);
      setFin(null);
      setLoading(false);
      router.refresh();
    } else {
      setShowConfig(true);
    }
  }

  async function activerUrgence() {
    if (!heureChoix) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const finISO = new Date(`${today}T${heureChoix}:00`).toISOString();
    const supabase = createClient();
    // @ts-ignore
    await supabase.from("profiles_artisans").update({ urgence_actif: true, urgence_fin: finISO }).eq("id", artisanId);
    setActif(true);
    setFin(finISO);
    setShowConfig(false);
    setLoading(false);
    router.refresh();
  }

  async function saveDelai(val: number) {
    setDelai(val);
    const supabase = createClient();
    // @ts-ignore
    await supabase.from("profiles_artisans").update({ delai_entre_interventions_minutes: val }).eq("id", artisanId);
  }

  const heuresDispos = () => {
    const opts = [];
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes() < 30 ? 30 : 60;
    for (let total = h * 60 + m; total < 24 * 60; total += 30) {
      const hh = Math.floor(total / 60);
      const mm = total % 60;
      opts.push(`${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`);
    }
    return opts;
  };

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
      actif ? "border-red-200 bg-red-50" : isSanctioned ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-white"
    }`}>
      <div className={`px-5 py-4 flex items-center justify-between ${actif ? "border-b border-red-100" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${actif ? "bg-red-100" : "bg-gray-100"}`}>
            <svg className={`w-5 h-5 ${actif ? "text-red-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className={`text-sm font-bold ${actif ? "text-red-700" : "text-gray-700"}`}>Mode urgence</p>
            {actif && timeLeft && <p className="text-xs text-red-500">Disponible encore {timeLeft}</p>}
            {isSanctioned && <p className="text-xs text-gray-500">Suspendu jusqu&apos;à {sanctionEnd}</p>}
            {!actif && !isSanctioned && <p className="text-xs text-gray-400">Inactif</p>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggleUrgence(); }}
          disabled={loading || isSanctioned}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${actif ? "bg-red-500" : "bg-gray-200"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${actif ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      {showConfig && !actif && (
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-600">Jusqu&apos;à quelle heure êtes-vous disponible ?</p>
          <div className="flex gap-2 flex-wrap">
            {heuresDispos().slice(0, 8).map(h => (
              <button key={h} onClick={() => setHeureChoix(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  heureChoix === h ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
                }`}>{h}</button>
            ))}
          </div>
          {heuresDispos().length > 8 && (
            <select value={heureChoix} onChange={e => setHeureChoix(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-400">
              <option value="">Autre heure...</option>
              {heuresDispos().map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowConfig(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={activerUrgence} disabled={!heureChoix || loading}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50">
              {loading ? "..." : "Activer"}
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">Délai entre interventions</p>
          <p className="text-[11px] text-gray-400">Temps de battement après chaque intervention urgence</p>
        </div>
        <select value={delai} onChange={e => saveDelai(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-400 text-gray-700">
          {[0, 15, 30, 45, 60, 90, 120].map(v => (
            <option key={v} value={v}>{v === 0 ? "Aucun" : `${v} min`}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
