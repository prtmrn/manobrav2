"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type Dispo = {
  id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  actif: boolean;
  type?: string;
  date_specifique?: string | null;
};

type Indispo = {
  id: string;
  date_debut: string;
  date_fin: string;
  motif: string | null;
};

type Reservation = {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
  service_titre: string | null;
  client_nom: string | null;
  client_prenom: string | null;
  adresse_intervention: string | null;
};

interface PlanningClientProps {
  userId: string;
  googleCalendarConnected?: boolean;
  initialDispos: Dispo[];
  initialIndispos: Indispo[];
  initialReservations: Reservation[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // px par heure
const START_HOUR = 6;
const END_HOUR = 23;
const VISIBLE_HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function getWeekDates(offset = 0): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

function topPx(time: string): number {
  return minutesToPx(timeToMinutes(time) - START_HOUR * 60);
}

function heightPx(start: string, end: string): number {
  return minutesToPx(timeToMinutes(end) - timeToMinutes(start));
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function PlanningClient({
  userId,
  googleCalendarConnected = false,
  initialDispos,
  initialIndispos,
  initialReservations,
}: PlanningClientProps) {
  const supabase = createClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dispos, setDispos] = useState<Dispo[]>(initialDispos);
  const [indispos, setIndispos] = useState<Indispo[]>(initialIndispos);
  const [reservations] = useState<Reservation[]>(initialReservations);
  const [showDispoModal, setShowDispoModal] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState<{ jourId: number; heure: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDates = getWeekDates(weekOffset);
  const today = toISO(new Date());

  // Scroll vers l'heure actuelle
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const top = minutesToPx(now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) - 100;
      scrollRef.current.scrollTop = Math.max(0, top);
    }
  }, []);

  // Mise à jour heure courante
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Calculer top/height de l'indicateur "maintenant" ──────────────────────
  const nowTop = (() => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    if (h < START_HOUR || h >= END_HOUR) return null;
    return minutesToPx(h * 60 + m - START_HOUR * 60);
  })();

  const todayColIndex = weekDates.findIndex(d => toISO(d) === today);

  // ── Supprimer disponibilité ────────────────────────────────────────────────
  async function deleteDispo(id: string) {
    await supabase.from("disponibilites").delete().eq("id", id);
    setDispos(prev => prev.filter(d => d.id !== id));
    showToast("Créneau supprimé");
  }

  // ── Ajouter disponibilité rapide (clic sur la grille) ─────────────────────
  async function addQuickSlot(jourId: number, heure: string) {
    const heureFin = `${String(Math.min(Number(heure.split(":")[0]) + 1, 23)).padStart(2, "0")}:00`;
    const { data, error } = await (supabase.from("disponibilites") as any).insert({
      artisan_id: userId,
      jour_semaine: jourId,
      heure_debut: heure + ":00",
      heure_fin: heureFin + ":00",
      actif: true,
      type: "normal",
    }).select().single();
    if (!error && data) {
      setDispos(prev => [...prev, data as Dispo]);
      showToast("Créneau ajouté");
    }
    setShowAddSlot(null);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border ${
          toast.ok ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(0)}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <h2 className="text-base font-bold text-gray-900">
            {weekDates[0] && weekDates[6] && (
              weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) +
              " – " +
              weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Google Calendar */}
          {googleCalendarConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Google Agenda
            </span>
          ) : (
            <a href="/api/auth/google-calendar" className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connecter Google
            </a>
          )}
          <button
            onClick={() => setShowDispoModal(true)}
            className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            Mes disponibilités
          </button>
        </div>
      </div>

      {/* ── Grille jours (header fixe) ────────────────────────────────────── */}
      <div className="flex flex-shrink-0 border-b border-gray-100 bg-white">
        <div className="w-14 flex-shrink-0" />
        {weekDates.map((date, i) => {
          const iso = toISO(date);
          const isToday = iso === today;
          return (
            <div key={i} className={`flex-1 text-center py-2 border-l border-gray-100 ${isToday ? "bg-brand-50" : ""}`}>
              <div className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-brand-600" : "text-gray-400"}`}>
                {JOURS[i]}
              </div>
              <div className={`text-xl font-bold mt-0.5 w-9 h-9 flex items-center justify-center mx-auto rounded-full ${
                isToday ? "bg-brand-600 text-white" : "text-gray-800"
              }`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Corps scrollable ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="flex" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
          {/* Colonne heures */}
          <div className="w-14 flex-shrink-0 relative">
            {VISIBLE_HOURS.map(h => (
              <div key={h} className="absolute w-full" style={{ top: `${minutesToPx((h - START_HOUR) * 60)}px` }}>
                <span className="text-[10px] text-gray-400 font-medium pr-2 block text-right leading-none -mt-2">
                  {h === 0 ? "" : `${h}h`}
                </span>
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {weekDates.map((date, dayIdx) => {
            const iso = toISO(date);
            const isToday = iso === today;
            const jourSemaine = dayIdx; // 0=Lun

            // Disponibilités de ce jour
            const disposDuJour = dispos.filter(d => d.actif && d.jour_semaine === jourSemaine);

            // Indispos couvrant ce jour
            const indisposDuJour = indispos.filter(i => i.date_debut <= iso && i.date_fin >= iso);

            // Réservations de ce jour
            const resasDuJour = reservations.filter(r => r.date === iso);

            return (
              <div
                key={dayIdx}
                className={`flex-1 relative border-l border-gray-100 ${isToday ? "bg-brand-50/20" : ""}`}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const totalMinutes = Math.floor(y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
                  const h = Math.floor(totalMinutes / 60);
                  const m = totalMinutes % 60;
                  const heure = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                  setShowAddSlot({ jourId: jourSemaine, heure });
                }}
              >
                {/* Lignes heures */}
                {VISIBLE_HOURS.map(h => (
                  <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${minutesToPx((h - START_HOUR) * 60)}px` }} />
                ))}
                {/* Demi-heures */}
                {VISIBLE_HOURS.map(h => (
                  <div key={`h-${h}`} className="absolute w-full border-t border-gray-50" style={{ top: `${minutesToPx((h - START_HOUR) * 60 + 30)}px` }} />
                ))}

                {/* Indisponibilités */}
                {indisposDuJour.map(ind => (
                  <div
                    key={ind.id}
                    className="absolute inset-x-0.5 bg-orange-100 border border-orange-200 rounded opacity-60 pointer-events-none"
                    style={{ top: 0, height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
                  >
                    <span className="text-[10px] font-bold text-orange-700 p-1 block">Indispo</span>
                  </div>
                ))}

                {/* Disponibilités */}
                {disposDuJour.map(d => {
                  const top = topPx(d.heure_debut);
                  const height = heightPx(d.heure_debut, d.heure_fin);
                  if (height <= 0) return null;
                  const isUrgence = (d as any).type === "urgence";
                  return (
                    <div
                      key={d.id}
                      className={`absolute inset-x-0.5 rounded-lg border text-[10px] font-semibold px-1.5 py-1 overflow-hidden cursor-pointer group ${
                        isUrgence
                          ? "bg-red-100 border-red-300 text-red-800"
                          : "bg-green-100 border-green-300 text-green-800"
                      }`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between">
                        <span>{formatTime(d.heure_debut)}–{formatTime(d.heure_fin)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteDispo(d.id); }}
                          className="opacity-0 group-hover:opacity-100 text-current hover:text-red-600 transition-all ml-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {isUrgence && height > 40 && <div className="text-[9px] opacity-70">Urgence</div>}
                    </div>
                  );
                })}

                {/* Réservations */}
                {resasDuJour.map(r => {
                  const top = topPx(r.heure_debut);
                  const height = heightPx(r.heure_debut, r.heure_fin);
                  if (height <= 0) return null;
                  const isConfirme = r.statut === "confirme" || r.statut === "en_cours";
                  return (
                    <div
                      key={r.id}
                      className={`absolute inset-x-0.5 rounded-lg border text-[10px] font-semibold px-1.5 py-1 overflow-hidden z-10 ${
                        r.statut === "en_cours"
                          ? "bg-brand-600 text-white border-brand-700"
                          : r.statut === "confirme"
                          ? "bg-blue-100 border-blue-300 text-blue-900"
                          : "bg-amber-100 border-amber-300 text-amber-900"
                      }`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-bold truncate">
                        {r.client_prenom} {r.client_nom}
                      </div>
                      {height > 35 && (
                        <div className="truncate opacity-80">{r.service_titre}</div>
                      )}
                      {height > 55 && (
                        <div className="opacity-70">{formatTime(r.heure_debut)}–{formatTime(r.heure_fin)}</div>
                      )}
                    </div>
                  );
                })}

                {/* Indicateur heure courante */}
                {isToday && nowTop !== null && (
                  <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: `${nowTop}px` }}>
                    <div className="relative flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                      <div className="flex-1 h-px bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pop-up clic rapide ────────────────────────────────────────────── */}
      {showAddSlot && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setShowAddSlot(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">Ajouter une disponibilité</h3>
            <p className="text-sm text-gray-500 mb-4">
              {JOURS[showAddSlot.jourId]} à {showAddSlot.heure}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowAddSlot(null)} className="flex-1 py-2 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button
                onClick={() => addQuickSlot(showAddSlot.jourId, showAddSlot.heure)}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
              >
                Ajouter 1h
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal "Mes disponibilités" ────────────────────────────────────── */}
      {showDispoModal && (
        <DispoModal
          userId={userId}
          dispos={dispos}
          setDispos={setDispos}
          onClose={() => setShowDispoModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── Modal configuration disponibilités ──────────────────────────────────────
function DispoModal({
  userId,
  dispos,
  setDispos,
  onClose,
  showToast,
}: {
  userId: string;
  dispos: Dispo[];
  setDispos: React.Dispatch<React.SetStateAction<Dispo[]>>;
  onClose: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ jours: [] as number[], debut: "09:00", fin: "17:00", type: "normal" as "normal" | "urgence" });
  const [error, setError] = useState<string | null>(null);

  const JOURS_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

  async function handleAdd() {
    if (form.jours.length === 0) { setError("Sélectionnez au moins un jour"); return; }
    if (toMin(form.fin) <= toMin(form.debut)) { setError("L'heure de fin doit être après le début"); return; }

    // Anti-chevauchement
    for (const j of form.jours) {
      const existing = dispos.filter(d => d.actif && d.jour_semaine === j);
      for (const e of existing) {
        const same = e.type === form.type || (!e.type && form.type === "normal");
        if (!same) continue;
        if (toMin(form.debut) < toMin(e.heure_fin) && toMin(form.fin) > toMin(e.heure_debut)) {
          setError(`Chevauchement le ${JOURS_LABELS[j]} avec ${e.heure_debut.slice(0,5)}–${e.heure_fin.slice(0,5)}`);
          return;
        }
      }
    }

    setLoading(true);
    setError(null);
    const rows = form.jours.map(j => ({
      artisan_id: userId,
      jour_semaine: j,
      heure_debut: form.debut + ":00",
      heure_fin: form.fin + ":00",
      actif: true,
      type: form.type,
    }));

    const { data, error: err } = await (supabase.from("disponibilites") as any).insert(rows).select();
    if (err) { setError(err.message); }
    else if (data) {
      setDispos(prev => [...prev, ...(data as Dispo[])].sort((a, b) => a.jour_semaine - b.jour_semaine || a.heure_debut.localeCompare(b.heure_debut)));
      setShowAdd(false);
      setForm({ jours: [], debut: "09:00", fin: "17:00", type: "normal" });
      showToast("Créneau ajouté");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("disponibilites").delete().eq("id", id);
    setDispos(prev => prev.filter(d => d.id !== id));
    showToast("Créneau supprimé");
  }

  const grouped = Array.from({ length: 7 }, (_, i) => ({
    jour: i,
    label: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i],
    dispos: dispos.filter(d => d.actif && d.jour_semaine === i).sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Mes disponibilités</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Corps modal */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {grouped.map(g => (
            <div key={g.jour}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{g.label}</span>
                {g.dispos.length === 0 && <span className="text-[11px] text-gray-300 italic">Repos</span>}
              </div>
              <div className="space-y-1">
                {g.dispos.map(d => (
                  <div key={d.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm ${
                    (d as any).type === "urgence" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"
                  }`}>
                    <span className="font-semibold">{d.heure_debut.slice(0,5)} – {d.heure_fin.slice(0,5)}</span>
                    <div className="flex items-center gap-2">
                      {(d as any).type === "urgence" && <span className="text-[10px] font-bold text-red-600">URGENCE</span>}
                      <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Formulaire ajout */}
          {showAdd && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-bold text-gray-700">Nouveau créneau</p>
              <div className="grid grid-cols-7 gap-1">
                {["L","M","M","J","V","S","D"].map((l, i) => (
                  <button key={i} type="button"
                    onClick={() => setForm(f => ({ ...f, jours: f.jours.includes(i) ? f.jours.filter(j => j !== i) : [...f.jours, i] }))}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${form.jours.includes(i) ? "bg-brand-600 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-brand-300"}`}
                  >{l}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Début</label>
                  <input type="time" value={form.debut} onChange={e => setForm(f => ({ ...f, debut: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Fin</label>
                  <input type="time" value={form.fin} onChange={e => setForm(f => ({ ...f, fin: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Mode urgence</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, type: f.type === "urgence" ? "normal" : "urgence" }))}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${form.type === "urgence" ? "bg-red-500" : "bg-gray-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.type === "urgence" ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowAdd(false); setError(null); }} className="flex-1 py-2 rounded-xl text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button onClick={handleAdd} disabled={loading} className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50">
                  {loading ? "..." : "Ajouter"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer modal */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => { setShowAdd(true); setError(null); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ajouter un créneau
          </button>
        </div>
      </div>
    </div>
  );
}
