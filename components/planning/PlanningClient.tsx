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

type Evenement = {
  id: string;
  titre: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  description: string | null;
  couleur: string;
};

type CalEvent = {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  titre: string;
  couleur: string;
  type: "dispo" | "indispo" | "resa";
  raw: Dispo | Indispo | Reservation | Evenement;
  isBg?: boolean;
  customColor?: string;
};

type View = "jour" | "semaine" | "mois" | "liste";

type Category = {
  id: string;
  nom: string;
  couleur: string;
  visible: boolean;
  is_system: boolean;
  system_key: string | null;
};

interface PlanningClientProps {
  userId: string;
  googleCalendarConnected?: boolean;
  initialDispos: Dispo[];
  initialIndispos: Indispo[];
  initialReservations: Reservation[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const HOUR_HEIGHT = 56;
const START_HOUR = 6;
const END_HOUR = 23;
const VISIBLE_HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToPx(min: number): number {
  return (min / 60) * HOUR_HEIGHT;
}

function topPx(time: string): number {
  return minToPx(timeToMin(time) - START_HOUR * 60);
}

function heightPx(start: string, end: string): number {
  return Math.max(minToPx(timeToMin(end) - timeToMin(start)), 20);
}

function fmt(t: string): string { return t.slice(0, 5); }

function getWeekDates(baseDate: Date): Date[] {
  const dow = baseDate.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getMonthDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const dow = first.getDay();
  const startOffset = dow === 0 ? 6 : dow - 1;
  const dates: Date[] = [];
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(first);
    d.setDate(first.getDate() - i);
    dates.push(d);
  }
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  const remaining = 42 - dates.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(last);
    d.setDate(last.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function jourSemaineToISO(baseDate: Date, jourSemaine: number): string {
  const week = getWeekDates(baseDate);
  return toISO(week[jourSemaine]);
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

  // State persisté
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("planning_view") as View) || "semaine";
    return "semaine";
  });
  const [currentDate, setCurrentDate] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("planning_date");
      return saved ? new Date(saved) : new Date();
    }
    return new Date();
  });

  const [dispos, setDispos] = useState<Dispo[]>(initialDispos);
  const [indispos, setIndispos] = useState<Indispo[]>(initialIndispos);
  const [reservations] = useState<Reservation[]>(initialReservations);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [showDispoModal, setShowDispoModal] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [showCalendarIntegration, setShowCalendarIntegration] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("planning_colors");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const DEFAULT_COLORS: Record<string, string> = {
    confirme: "#3b82f6",
    en_cours: "#1d4ed8",
    en_attente: "#f59e0b",
    dispo: "#22c55e",
    urgence: "#ef4444",
    indispo: "#f97316",
  };
  const colors = { ...DEFAULT_COLORS, ...customColors, ...Object.fromEntries(
    categories.filter(c => c.system_key).map(c => [c.system_key!, c.couleur])
  )};
  const hiddenCategories = new Set(categories.filter(c => !c.visible).map(c => c.system_key ?? c.id));
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; heure: string } | null>(null);
  const [createModal, setCreateModal] = useState<{ date: string; heure: string } | null>(null);
  const [editDispo, setEditDispo] = useState<Dispo | null>(null);
  const [dragging, setDragging] = useState<{ ev: CalEvent; offsetY: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ date: string; top: number } | null>(null);
  const [resizing, setResizing] = useState<{ ev: CalEvent; startY: number; startFin: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = toISO(new Date());
  const weekDates = getWeekDates(currentDate);

  // Charger événements
  useEffect(() => {
    const from = new Date().toISOString().split("T")[0];
    const to = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
    fetch(`/api/planning/evenements?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => setEvenements(Array.isArray(data) ? data : []));
  }, []);

  // Charger catégories
  useEffect(() => {
    fetch("/api/planning/categories")
      .then(r => r.json())
      .then(data => { setCategories(data); setCategoriesLoaded(true); })
      .catch(() => setCategoriesLoaded(true));
  }, []);

  // Persister vue et date
  useEffect(() => {
    localStorage.setItem("planning_view", view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem("planning_date", currentDate.toISOString());
  }, [currentDate]);

  // Scroll vers l'heure actuelle
  useEffect(() => {
    if (scrollRef.current && (view === "semaine" || view === "jour")) {
      const now = new Date();
      const top = minToPx(now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) - 150;
      scrollRef.current.scrollTop = Math.max(0, top);
    }
  }, [view]);

  // Ticker
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Construire les événements ──────────────────────────────────────────────
  function buildEvents(dateRange: Date[]): CalEvent[] {
    const events: CalEvent[] = [];
    const isoSet = new Set(dateRange.map(toISO));

    // Disponibilités
    dispos.filter(d => d.actif).forEach(d => {
      dateRange.forEach(date => {
        if (d.jour_semaine !== date.getDay() - 1 && !(date.getDay() === 0 && d.jour_semaine === 6)) return;
        const iso = toISO(date);
        // Corriger index: lundi=0 en DB, lundi=1 en JS
        const jsDay = date.getDay(); // 0=dim,1=lun,...,6=sam
        const dbDay = jsDay === 0 ? 6 : jsDay - 1; // convertir
        if (d.jour_semaine !== dbDay) return;
        events.push({
          id: `dispo-${d.id}-${iso}`,
          date: iso,
          heure_debut: d.heure_debut,
          heure_fin: d.heure_fin,
          titre: d.type === "urgence" ? "Disponible (urgence)" : "Disponible",
          couleur: d.type === "urgence" ? "red" : "green",
          type: "dispo",
          raw: d,
          isBg: true,
        });
      });
    });

    // Indisponibilités
    indispos.forEach(ind => {
      dateRange.forEach(date => {
        const iso = toISO(date);
        if (ind.date_debut <= iso && ind.date_fin >= iso) {
          events.push({
            id: `indispo-${ind.id}-${iso}`,
            date: iso,
            heure_debut: "00:00",
            heure_fin: "23:59",
            titre: ind.motif || "Indisponible",
            couleur: "orange",
            type: "indispo",
            raw: ind,
          });
        }
      });
    });

    // Réservations
    reservations.forEach(r => {
      if (isoSet.has(r.date)) {
        events.push({
          id: `resa-${r.id}`,
          date: r.date,
          heure_debut: r.heure_debut,
          heure_fin: r.heure_fin,
          titre: r.client_prenom ? `${r.client_prenom} ${r.client_nom ?? ""}` : r.service_titre ?? "Réservation",
          couleur: r.statut === "en_cours" ? "brand" : r.statut === "confirme" ? "blue" : "amber",
          type: "resa",
          raw: r,
        });
      }
    });

    // Événements perso
    evenements.forEach(ev => {
      if (isoSet.has(ev.date)) {
        events.push({
          id: `evt-${ev.id}`,
          date: ev.date,
          heure_debut: ev.heure_debut,
          heure_fin: ev.heure_fin,
          titre: ev.titre,
          couleur: "custom",
          type: "resa",
          raw: ev,
          customColor: ev.couleur,
        });
      }
    });

    return events;
  }

  // ── Couleurs ──────────────────────────────────────────────────────────────
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    green:  { bg: "bg-green-100",  border: "border-green-300",  text: "text-green-900"  },
    red:    { bg: "bg-red-100",    border: "border-red-300",    text: "text-red-900"    },
    orange: { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-900" },
    blue:   { bg: "bg-blue-100",   border: "border-blue-300",   text: "text-blue-900"   },
    amber:  { bg: "bg-amber-100",  border: "border-amber-300",  text: "text-amber-900"  },
    brand:  { bg: "bg-brand-600",  border: "border-brand-700",  text: "text-white"      },
  };

  // ── Nowline ───────────────────────────────────────────────────────────────
  const nowTop = (() => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    if (h < START_HOUR || h >= END_HOUR) return null;
    return minToPx(h * 60 + m - START_HOUR * 60);
  })();

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate);
    if (view === "jour") d.setDate(d.getDate() + dir);
    else if (view === "semaine") d.setDate(d.getDate() + dir * 7);
    else if (view === "mois") d.setMonth(d.getMonth() + dir);
    else if (view === "liste") d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  }

  function goToday() { setCurrentDate(new Date()); }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function pxToTime(px: number): string {
    const totalMin = Math.round(px / HOUR_HEIGHT * 60) + START_HOUR * 60;
    const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 30, totalMin));
    const h = Math.floor(clamped / 60);
    const m = Math.round((clamped % 60) / 15) * 15;
    return `${String(h).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}:00`;
  }

  async function handleDrop(ev: CalEvent, newDate: string, newDebut: string) {
    const durMin = timeToMin(ev.heure_fin) - timeToMin(ev.heure_debut);
    const debutMin = timeToMin(newDebut);
    const finMin = Math.min(debutMin + durMin, END_HOUR * 60);
    const newFin = `${String(Math.floor(finMin/60)).padStart(2,"0")}:${String(finMin%60).padStart(2,"0")}:00`;

    if (ev.type === "dispo") {
      const dispo = ev.raw as Dispo;
      const dateObj = new Date(newDate + "T12:00:00");
      const jsDay = dateObj.getDay();
      const dbDay = jsDay === 0 ? 6 : jsDay - 1;
      const supabase = createClient();
      await (supabase.from("disponibilites") as any)
        .update({ jour_semaine: dbDay, heure_debut: newDebut, heure_fin: newFin })
        .eq("id", dispo.id);
      setDispos(prev => prev.map(d => d.id === dispo.id
        ? { ...d, jour_semaine: dbDay, heure_debut: newDebut, heure_fin: newFin }
        : d
      ));
    } else if (ev.id.startsWith("evt-")) {
      const evtId = ev.id.replace("evt-", "");
      await fetch("/api/planning/evenements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: evtId, titre: ev.titre, date: newDate, heure_debut: newDebut, heure_fin: newFin }),
      });
      setEvenements(prev => prev.map(e => e.id === evtId
        ? { ...e, date: newDate, heure_debut: newDebut, heure_fin: newFin }
        : e
      ));
    }
    setDragging(null);
    setDragOver(null);
  }

  async function handleResize(ev: CalEvent, newFin: string) {
    if (ev.type === "dispo") {
      const dispo = ev.raw as Dispo;
      const supabase = createClient();
      await (supabase.from("disponibilites") as any)
        .update({ heure_fin: newFin + ":00" })
        .eq("id", dispo.id);
      setDispos(prev => prev.map(d => d.id === dispo.id ? { ...d, heure_fin: newFin + ":00" } : d));
    } else if (ev.id.startsWith("evt-")) {
      const evtId = ev.id.replace("evt-", "");
      await fetch("/api/planning/evenements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: evtId, titre: ev.titre, date: ev.date, heure_debut: ev.heure_debut, heure_fin: newFin }),
      });
      setEvenements(prev => prev.map(e => e.id === evtId ? { ...e, heure_fin: newFin } : e));
    }
    setResizing(null);
  }

  // ── Supprimer dispo ───────────────────────────────────────────────────────
  async function deleteDispo(id: string) {
    await supabase.from("disponibilites").delete().eq("id", id);
    setDispos(prev => prev.filter(d => d.id !== id));
    setSelectedEvent(null);
    showToast("Créneau supprimé");
  }

  // ── Ajouter dispo rapide ──────────────────────────────────────────────────
  async function addQuickSlot(date: string, heure: string, dureeMins = 60) {
    const startMin = timeToMin(heure + ":00");
    const endMin = Math.min(startMin + dureeMins, END_HOUR * 60);
    const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
    const endM = String(endMin % 60).padStart(2, "0");
    const dateObj = new Date(date + "T12:00:00");
    const jsDay = dateObj.getDay();
    const dbDay = jsDay === 0 ? 6 : jsDay - 1;

    const { data, error } = await (supabase.from("disponibilites") as any).insert({
      artisan_id: userId,
      jour_semaine: dbDay,
      heure_debut: heure + ":00",
      heure_fin: `${endH}:${endM}:00`,
      actif: true,
      type: "normal",
    }).select().single();

    if (!error && data) {
      setDispos(prev => [...prev, data as Dispo]);
      showToast("Créneau ajouté");
    }
    setQuickAdd(null);
  }

  // ── Titre header ─────────────────────────────────────────────────────────
  const headerTitle = (() => {
    if (view === "jour") {
      return currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (view === "semaine") {
      const wd = weekDates;
      return `${wd[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} – ${wd[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
    }
    if (view === "mois") {
      return `${MOIS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    return `${MOIS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  })();

  // ── Recherche ─────────────────────────────────────────────────────────────
  const searchResults = searchQuery.length > 1 ? reservations.filter(r =>
    [r.client_nom, r.client_prenom, r.service_titre, r.adresse_intervention].some(f =>
      f?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) : [];

  // ─────────────────────────────────────────────────────────────────────────
  // VUES
  // ─────────────────────────────────────────────────────────────────────────

  // ── Vue SEMAINE ───────────────────────────────────────────────────────────
  function ViewSemaine() {
    const events = buildEvents(weekDates);
    const todayIdx = weekDates.findIndex(d => toISO(d) === today);

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* En-têtes jours */}
        <div className="flex flex-shrink-0 border-b border-gray-100">
          <div className="w-14 flex-shrink-0" />
          {weekDates.map((date, i) => {
            const iso = toISO(date);
            const isT = iso === today;
            return (
              <div key={i} className={`flex-1 text-center py-2 border-l border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isT ? "bg-blue-50" : ""}`}
                onClick={() => { setCurrentDate(date); setView("jour"); }}>
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${isT ? "text-blue-600" : "text-gray-400"}`}>{JOURS_COURT[i]}</div>
                <div className={`text-xl font-bold w-9 h-9 flex items-center justify-center mx-auto rounded-full mt-0.5 ${isT ? "bg-blue-600 text-white" : "text-gray-800"}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grille */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="flex" style={{ minHeight: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
            {/* Heures */}
            <div className="w-14 flex-shrink-0 relative">
              {VISIBLE_HOURS.map(h => (
                <div key={h} className="absolute w-full" style={{ top: `${minToPx((h - START_HOUR) * 60)}px` }}>
                  <span className="text-[10px] text-gray-400 pr-2 block text-right -mt-2">{h}h</span>
                </div>
              ))}
            </div>

            {/* Colonnes */}
            {weekDates.map((date, dayIdx) => {
              const iso = toISO(date);
              const isT = iso === today;
              const dayEvents = events.filter(e => e.date === iso && e.type !== "indispo");
              const indispoDay = events.find(e => e.date === iso && e.type === "indispo");

              // Gestion chevauchements
              function getColumns(evts: CalEvent[]) {
                const sorted = [...evts].sort((a, b) => timeToMin(a.heure_debut) - timeToMin(b.heure_debut));
                const cols: CalEvent[][] = [];
                sorted.forEach(ev => {
                  let placed = false;
                  for (const col of cols) {
                    const last = col[col.length - 1];
                    if (timeToMin(ev.heure_debut) >= timeToMin(last.heure_fin)) {
                      col.push(ev);
                      placed = true;
                      break;
                    }
                  }
                  if (!placed) cols.push([ev]);
                });
                return cols;
              }

              const cols = getColumns(dayEvents);
              const totalCols = cols.length;

              return (
                <div key={dayIdx}
                  className={`flex-1 relative border-l border-gray-100 ${isT ? "bg-blue-50/20" : ""} ${dragOver?.date === iso ? "bg-blue-50/40" : ""}`}
                  data-col={iso}
                  onClick={(e) => {
                    if (dragging) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
                    const totalMin = Math.floor(y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
                    const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
                    const m = String(totalMin % 60).padStart(2, "0");
                    setCreateModal({ date: iso, heure: `${h}:${m}` });
                  }}
                >
                  {/* Lignes heures */}
                  {VISIBLE_HOURS.map(h => (
                    <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${minToPx((h - START_HOUR) * 60)}px` }} />
                  ))}
                  {VISIBLE_HOURS.map(h => (
                    <div key={`hh-${h}`} className="absolute w-full border-t border-gray-50" style={{ top: `${minToPx((h - START_HOUR) * 60 + 30)}px` }} />
                  ))}

                  {/* Indispo background */}
                  {indispoDay && (
                    <div className="absolute inset-0 bg-orange-50 opacity-60 pointer-events-none" />
                  )}

                  {/* Disponibilités — bandeau fin gauche, cliquable */}
                  {events.filter(e => e.date === iso && e.type === "dispo" && e.couleur !== "red").map(ev => (
                    <div key={ev.id}
                      className="absolute z-0 cursor-pointer group/dispo"
                      style={{
                        top: `${topPx(ev.heure_debut)}px`,
                        height: `${heightPx(ev.heure_debut, ev.heure_fin)}px`,
                        left: 0,
                        width: "20px",
                      }}
                      onClick={(e) => { e.stopPropagation(); setEditDispo(ev.raw as Dispo); }}
                      title="Cliquer pour modifier"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 group-hover/dispo:w-2.5 transition-all"
                        style={{ backgroundColor: colors.dispo, borderRadius: "0 2px 2px 0" }} />
                      <span className="absolute left-3 top-0.5 text-[9px] font-semibold whitespace-nowrap opacity-70 group-hover/dispo:opacity-100 transition-opacity"
                        style={{ color: colors.dispo }}>Disponible</span>
                    </div>
                  ))}

                  {/* Événements avec gestion chevauchements */}
                  {cols.filter(col => col.some(ev => ev.type !== "dispo")).map((col, colIdx) =>
                    col.filter(ev => ev.type !== "dispo").map(ev => {
                      const top = topPx(ev.heure_debut);
                      const height = heightPx(ev.heure_debut, ev.heure_fin);
                      const c = colorMap[ev.couleur] ?? colorMap.blue;
                      const nonDispoCols = cols.filter(c => c.some(e => e.type !== "dispo"));
                      const totalNonDisp = nonDispoCols.length;
                      const colI = nonDispoCols.indexOf(col);
                      const width = totalNonDisp > 1 ? `${100 / totalNonDisp}%` : "calc(100% - 4px)";
                      const left = totalNonDisp > 1 ? `${(colI / totalNonDisp) * 100}%` : "2px";
                      return (
                        <div key={ev.id}
                          className={`absolute rounded-lg border px-1.5 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing z-10 transition-opacity ${dragging?.ev.id === ev.id ? "opacity-40" : "hover:opacity-90"}`}
                          style={{
                            top: `${top}px`, height: `${height}px`, left, width,
                            backgroundColor: ev.customColor ? ev.customColor + "33" : undefined,
                            borderColor: ev.customColor ? ev.customColor + "88" : "transparent",
                            borderWidth: "1px",
                          }}
                          onClick={(e) => { e.stopPropagation(); if (!dragging) setSelectedEvent(ev); }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            setDragging({ ev, offsetY: e.clientY - rect.top });
                          }}
                        >
                          <div className="text-[10px] font-bold truncate leading-tight select-none" style={{
                            color: ev.customColor ?? (ev.couleur === "brand" ? "white" : colors[ev.couleur === "blue" ? "confirme" : ev.couleur === "amber" ? "en_attente" : "en_cours"])
                          }}>{ev.titre}</div>
                          {height > 30 && <div className="text-[9px] opacity-75 truncate select-none" style={{
                            color: ev.customColor ?? (ev.couleur === "brand" ? "white" : colors[ev.couleur === "blue" ? "confirme" : ev.couleur === "amber" ? "en_attente" : "en_cours"])
                          }}>{fmt(ev.heure_debut)}–{fmt(ev.heure_fin)}</div>}
                          {/* Handle resize */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize flex items-center justify-center"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizing({ ev, startY: e.clientY, startFin: ev.heure_fin });
                            }}
                          >
                            <div className="w-6 h-0.5 rounded-full bg-current opacity-40" />
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Ghost drag */}
                  {dragging && dragOver?.date === iso && (
                    <div className="absolute inset-x-0.5 rounded-lg border-2 border-blue-400 border-dashed bg-blue-50/50 z-20 pointer-events-none"
                      style={{
                        top: `${dragOver.top}px`,
                        height: `${heightPx(dragging.ev.heure_debut, dragging.ev.heure_fin)}px`,
                      }}
                    />
                  )}
                  {/* Nowline */}
                  {isT && nowTop !== null && (
                    <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: `${nowTop}px` }}>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Vue JOUR ──────────────────────────────────────────────────────────────
  function ViewJour() {
    const events = buildEvents([currentDate]);
    const iso = toISO(currentDate);
    const dayEvents = events.filter(e => e.date === iso && e.type !== "indispo");
    const indispoDay = events.find(e => e.date === iso && e.type === "indispo");

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-shrink-0 border-b border-gray-100 py-2 px-4">
          {indispoDay && <span className="ml-2 text-xs text-orange-600 font-medium">Indisponible</span>}
        </div>
        <div className="flex flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="w-14 flex-shrink-0 relative" style={{ minHeight: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
            {VISIBLE_HOURS.map(h => (
              <div key={h} className="absolute w-full" style={{ top: `${minToPx((h - START_HOUR) * 60)}px` }}>
                <span className="text-[10px] text-gray-400 pr-2 block text-right -mt-2">{h}h</span>
              </div>
            ))}
          </div>
          <div className="flex-1 relative border-l border-gray-100" style={{ minHeight: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const y = e.clientY - rect.top;
              const totalMin = Math.floor(y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
              const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
              const m = String(totalMin % 60).padStart(2, "0");
              setCreateModal({ date: iso, heure: `${h}:${m}` });
            }}
          >
            {VISIBLE_HOURS.map(h => (
              <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${minToPx((h - START_HOUR) * 60)}px` }} />
            ))}
            {indispoDay && <div className="absolute inset-0 bg-orange-50 opacity-60 pointer-events-none" />}
            {dayEvents.map(ev => {
              const c = colorMap[ev.couleur] ?? colorMap.blue;
              return (
                <div key={ev.id}
                  className={`absolute left-1 right-1 rounded-lg border px-2 py-1 overflow-hidden cursor-pointer hover:opacity-90 z-10 ${c.bg} ${c.border} ${c.text}`}
                  style={{ top: `${topPx(ev.heure_debut)}px`, height: `${heightPx(ev.heure_debut, ev.heure_fin)}px` }}
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                >
                  <div className="text-xs font-bold truncate">{ev.titre}</div>
                  <div className="text-[10px] opacity-75">{fmt(ev.heure_debut)} – {fmt(ev.heure_fin)}</div>
                </div>
              );
            })}
            {toISO(currentDate) === today && nowTop !== null && (
              <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: `${nowTop}px` }}>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Vue MOIS ──────────────────────────────────────────────────────────────
  function ViewMois() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dates = getMonthDates(year, month);
    const events = buildEvents(dates);

    return (
      <div className="flex-1 overflow-auto">
        {/* En-têtes */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {JOURS_COURT.map(j => (
            <div key={j} className="text-center text-[11px] font-semibold text-gray-400 uppercase py-2">{j}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {dates.map((date, i) => {
            const iso = toISO(date);
            const isT = iso === today;
            const isCurrentMonth = date.getMonth() === month;
            const dayEvents = events.filter(e => e.date === iso).slice(0, 3);
            const more = events.filter(e => e.date === iso).length - 3;
            return (
              <div key={i}
                className={`border-b border-r border-gray-100 min-h-[90px] p-1 cursor-pointer hover:bg-gray-50 transition-colors ${!isCurrentMonth ? "bg-gray-50/50" : ""}`}
                onClick={() => { setCurrentDate(date); setView("jour"); }}
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 ${isT ? "bg-blue-600 text-white" : isCurrentMonth ? "text-gray-800" : "text-gray-300"}`}>
                  {date.getDate()}
                </div>
                {dayEvents.map(ev => {
                  const c = colorMap[ev.couleur] ?? colorMap.blue;
                  return (
                    <div key={ev.id}
                      className={`text-[9px] font-semibold truncate rounded px-1 py-0.5 mb-0.5 ${c.bg} ${c.text}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                    >
                      {ev.type !== "dispo" && fmt(ev.heure_debut) + " "}{ev.titre}
                    </div>
                  );
                })}
                {more > 0 && <div className="text-[9px] text-gray-400 font-medium">+{more} autres</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Vue LISTE ─────────────────────────────────────────────────────────────
  function ViewListe() {
    const future: Date[] = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);
      future.push(d);
    }
    const events = buildEvents(future).filter(e => e.type === "resa").sort((a, b) => a.date.localeCompare(b.date) || a.heure_debut.localeCompare(b.heure_debut));

    if (events.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Aucune réservation dans les 90 prochains jours
        </div>
      );
    }

    let lastDate = "";
    return (
      <div className="flex-1 overflow-auto px-4 py-4 space-y-1">
        {events.map(ev => {
          const showDate = ev.date !== lastDate;
          lastDate = ev.date;
          const dateObj = new Date(ev.date + "T12:00:00");
          const c = colorMap[ev.couleur] ?? colorMap.blue;
          return (
            <div key={ev.id}>
              {showDate && (
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-4 mb-2 first:mt-0">
                  {dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}

                </div>
              )}
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:opacity-90 transition-opacity ${c.bg} ${c.border}`}
                onClick={() => setSelectedEvent(ev)}
              >
                <div className={`text-xs font-bold ${c.text} w-20 flex-shrink-0`}>{fmt(ev.heure_debut)} – {fmt(ev.heure_fin)}</div>
                <div className={`text-sm font-semibold truncate ${c.text}`}>{ev.titre}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Mini-calendrier ───────────────────────────────────────────────────────
  function MiniCal() {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    const dates = getMonthDates(year, month);

    return (
      <div className="w-56 flex-shrink-0 border-r border-gray-100 p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-700">{MOIS[month]} {year}</span>
          <div className="flex gap-1">
            <button onClick={() => { const d = new Date(miniCalDate); d.setMonth(d.getMonth() - 1); setMiniCalDate(d); }} className="p-0.5 hover:bg-gray-100 rounded text-gray-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => { const d = new Date(miniCalDate); d.setMonth(d.getMonth() + 1); setMiniCalDate(d); }} className="p-0.5 hover:bg-gray-100 rounded text-gray-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {["L","M","M","J","V","S","D"].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-semibold text-gray-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {dates.map((date, i) => {
            const iso = toISO(date);
            const isT = iso === today;
            const isSelected = iso === toISO(currentDate);
            const isCurMonth = date.getMonth() === month;
            const hasEvent = reservations.some(r => r.date === iso);
            return (
              <button key={i}
                onClick={() => { setCurrentDate(date); setMiniCalDate(date); if (view === "mois") setView("semaine"); }}
                className={`aspect-square flex flex-col items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                  isT ? "bg-blue-600 text-white" :
                  isSelected && !isT ? "bg-blue-100 text-blue-700" :
                  isCurMonth ? "text-gray-700 hover:bg-gray-100" : "text-gray-300"
                }`}
              >
                {date.getDate()}
                {hasEvent && !isT && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Légende */}
        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">Légende</p>
<button onClick={() => setShowLegendModal(true)} className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">Modifier</button>
          </div>
          {[
            { couleur: "green", label: "Disponible" },
            { couleur: "red", label: "Urgence" },
            { couleur: "blue", label: "Réservation" },
            { couleur: "amber", label: "En attente" },
            { couleur: "orange", label: "Indisponible" },
          ].map(({ couleur, label }) => {
            const c = colorMap[couleur];
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${c.bg} border ${c.border} flex-shrink-0`} />
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-[calc(100vh-4rem)] bg-white"
      onMouseMove={(e) => {
        if (dragging && scrollRef.current) {
          const scrollEl = scrollRef.current;
          const rect = scrollEl.getBoundingClientRect();
          const cols = scrollEl.querySelectorAll("[data-col]");
          let targetDate = dragging.ev.date;
          cols.forEach((col) => {
            const cr = col.getBoundingClientRect();
            if (e.clientX >= cr.left && e.clientX <= cr.right) {
              targetDate = (col as HTMLElement).dataset.col ?? dragging.ev.date;
            }
          });
          const scrollTop = scrollEl.scrollTop;
          const relY = e.clientY - rect.top + scrollTop - dragging.offsetY;
          setDragOver({ date: targetDate, top: Math.max(0, relY) });
        }
        if (resizing && scrollRef.current) {
          const scrollEl = scrollRef.current;
          const rect = scrollEl.getBoundingClientRect();
          const scrollTop = scrollEl.scrollTop;
          const startTop = topPx(resizing.startFin);
          const delta = e.clientY - resizing.startY;
          const newTop = startTop + delta;
          const newFinTime = pxToTime(newTop);
          setResizing(prev => prev ? { ...prev, currentFin: newFinTime } as any : null);
        }
      }}
      onMouseUp={(e) => {
        if (dragging && dragOver) {
          const newDebut = pxToTime(dragOver.top);
          handleDrop(dragging.ev, dragOver.date, newDebut);
        }
        if (resizing) {
          const r = resizing as any;
          if (r.currentFin) handleResize(resizing.ev, r.currentFin);
          else setResizing(null);
        }
      }}
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border ${
          toast.ok ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>{toast.msg}</div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
        {/* Aujourd'hui + nav */}
        <button onClick={goToday} className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          Aujourd&apos;hui
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <h2 className="text-base font-bold text-gray-900 flex-1">{headerTitle}</h2>

        {/* Recherche */}
        <div className="relative">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-48"
                onBlur={() => { if (!searchQuery) setShowSearch(false); }}
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
                  {searchResults.map(r => (
                    <button key={r.id} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      onClick={() => {
                        setCurrentDate(new Date(r.date + "T12:00:00"));
                        setView("jour");
                        setShowSearch(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="text-sm font-semibold text-gray-900">{r.client_prenom} {r.client_nom}</div>
                      <div className="text-xs text-gray-500">{new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR")} · {fmt(r.heure_debut)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          )}
        </div>

        {/* Sélecteur vue */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
          {(["jour", "semaine", "mois", "liste"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 transition-colors capitalize ${view === v ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              {v === "liste" ? "Planning" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Intégrer un calendrier */}
        <button
          onClick={() => setShowCalendarIntegration(true)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
            googleCalendarConnected
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-gray-500 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {googleCalendarConnected ? "Agenda connecté" : "Intégrer un agenda"}
        </button>

        {/* Mes disponibilités */}
        <button onClick={() => setShowDispoModal(true)}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          Mes disponibilités
        </button>
      </div>

      {/* ── Corps : mini-cal + vue ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <MiniCal />
        <div className="flex flex-col flex-1 overflow-hidden">
          {view === "semaine" && <ViewSemaine />}
          {view === "jour" && <ViewJour />}
          {view === "mois" && <ViewMois />}
          {view === "liste" && <ViewListe />}
        </div>
      </div>

      {/* ── Modal création ────────────────────────────────────────────────── */}
      {createModal && (
        <CreateEventModal
          date={createModal.date}
          heure={createModal.heure}
          categories={categories}
          onClose={() => setCreateModal(null)}
          onCreateDispo={(date, heure) => { addQuickSlot(date, heure); setCreateModal(null); }}
          onCreateEvenement={async (ev) => {
            const res = await fetch("/api/planning/evenements", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create", ...ev }),
            });
            const data = await res.json();
            if (data.id) setEvenements(prev => [...prev, data]);
            setCreateModal(null);
          }}
          onCreateIndispo={async (dateDebut, dateFin, motif) => {
            const supabase = createClient();
            const { data } = await (supabase.from("indisponibilites") as any).insert({
              artisan_id: userId,
              date_debut: dateDebut,
              date_fin: dateFin,
              motif: motif || null,
            }).select().single();
            if (data) setIndispos(prev => [...prev, data]);
            setCreateModal(null);
          }}
        />
      )}

      {/* ── Modal édition disponibilité ──────────────────────────────────── */}
      {editDispo && (
        <EditDispoModal
          dispo={editDispo}
          onClose={() => setEditDispo(null)}
          onDelete={async (id) => { await deleteDispo(id); setEditDispo(null); }}
          onUpdate={async (id, debut, fin) => {
            const supabase = createClient();
            const { data } = await (supabase.from("disponibilites") as any)
              .update({ heure_debut: debut + ":00", heure_fin: fin + ":00" })
              .eq("id", id).select().single();
            if (data) setDispos(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
            setEditDispo(null);
          }}
        />
      )}

      {/* ── Pop-up événement sélectionné ──────────────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-80" onClick={e => e.stopPropagation()}>
            <div className={`w-8 h-1 rounded-full mb-3 ${colorMap[selectedEvent.couleur]?.bg ?? "bg-gray-200"}`} />
            <h3 className="font-bold text-gray-900 text-base mb-1">{selectedEvent.titre}</h3>
            <p className="text-sm text-gray-500 mb-1">
              {new Date(selectedEvent.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-sm font-semibold text-gray-700 mb-4">
              {fmt(selectedEvent.heure_debut)} – {fmt(selectedEvent.heure_fin)}
            </p>
            {selectedEvent.type === "resa" && (
              <div className="space-y-1 mb-4 text-sm text-gray-600">
                {(selectedEvent.raw as Reservation).service_titre && (
                  <p>Service : <strong>{(selectedEvent.raw as Reservation).service_titre}</strong></p>
                )}
                {(selectedEvent.raw as Reservation).adresse_intervention && (
                  <p>Adresse : {(selectedEvent.raw as Reservation).adresse_intervention}</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setSelectedEvent(null)} className="flex-1 py-2 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Fermer
              </button>
              {selectedEvent.type === "dispo" && (
                <button onClick={() => deleteDispo((selectedEvent.raw as Dispo).id)} className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal intégration calendrier ──────────────────────────────────── */}
      {showCalendarIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCalendarIntegration(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">Intégrer un agenda</h3>
              <button onClick={() => setShowCalendarIntegration(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Connectez votre agenda pour synchroniser automatiquement vos réservations.</p>
            <div className="space-y-3">
              {/* Google */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${googleCalendarConnected ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-gray-300"} transition-colors`}>
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Google Agenda</p>
                    <p className="text-xs text-gray-500">{googleCalendarConnected ? "Connecté" : "Gmail, Google Workspace"}</p>
                  </div>
                </div>
                {googleCalendarConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Connecté
                    </span>
                    <button onClick={async () => { await fetch("/api/google-calendar/disconnect", { method: "POST" }); window.location.reload(); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium">Déconnecter</button>
                  </div>
                ) : (
                  <a href="/api/auth/google-calendar" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Connecter</a>
                )}
              </div>

              {/* Apple Calendar — bientôt */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Apple Calendar</p>
                    <p className="text-xs text-gray-400">Bientôt disponible</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">Bientôt</span>
              </div>

              {/* Outlook — bientôt */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-blue-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.33.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6V2.55q0-.44.3-.75.3-.3.75-.3h12.fishing 0 .44.3.75.3.3.75.3"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Outlook</p>
                    <p className="text-xs text-gray-400">Bientôt disponible</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">Bientôt</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal légende ───────────────────────────────────────────────── */}
      {showLegendModal && (
        <LegendModal
          categories={categories}
          setCategories={setCategories}
          onClose={() => setShowLegendModal(false)}
        />
      )}
      {/* ── Modal disponibilités ──────────────────────────────────────────── */}
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



// ─── Modal Création (Dispo / Événement / Indispo) ─────────────────────────────
function CreateEventModal({
  date, heure, onClose, onCreateDispo, onCreateEvenement, onCreateIndispo, categories,
}: {
  date: string;
  heure: string;
  onClose: () => void;
  onCreateDispo: (date: string, heure: string) => void;
  onCreateEvenement: (ev: {
    titre: string; date: string; heure_debut: string; heure_fin: string;
    description: string; couleur: string; lieu: string; notes_internes: string;
    statut: string; visibilite: string; invite_email: string; category_id: string | null;
    pieces_jointes: string[];
  }) => void;
  onCreateIndispo: (dateDebut: string, dateFin: string, motif: string) => void;
  categories: Category[];
}) {
  const [type, setType] = useState<"choix" | "dispo" | "evenement" | "indispo">("choix");
  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // Calcul heure de fin par défaut
  const defaultFin = () => {
    const [h, m] = heure.split(":").map(Number);
    const endMin = h * 60 + m + 60;
    return `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;
  };

  // Formulaire événement
  const [titre, setTitre] = useState("");
  const [debut, setDebut] = useState(heure);
  const [fin, setFin] = useState(defaultFin);
  const [description, setDescription] = useState("");
  const [couleur, setCouleur] = useState("#6366f1");
  const [lieu, setLieu] = useState("");
  const [notesInternes, setNotesInternes] = useState("");
  const [statut, setStatut] = useState("confirme");
  const [visibilite, setVisibilite] = useState("prive");
  const [inviteEmail, setInviteEmail] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatNom, setNewCatNom] = useState("");
  const [newCatCouleur, setNewCatCouleur] = useState("#6366f1");
  const [localCategories, setLocalCategories] = useState(categories);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Formulaire dispo
  const [dispoDebut, setDispoDebut] = useState(heure);
  const [dispoFin, setDispoFin] = useState(defaultFin);

  // Formulaire indispo
  const [indispoFin, setIndispoFin] = useState(date);
  const [motif, setMotif] = useState("");

  function setDuree(mins: number) {
    const [h, m] = debut.split(":").map(Number);
    const endMin = Math.min(h * 60 + m + mins, 23 * 60 + 59);
    setFin(`${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`);
  }

  async function handleCreateCategorie() {
    if (!newCatNom.trim()) return;
    const res = await fetch("/api/planning/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", nom: newCatNom, couleur: newCatCouleur }),
    });
    const data = await res.json();
    setLocalCategories(prev => [...prev, data]);
    setCategoryId(data.id);
    setCouleur(data.couleur);
    setShowNewCat(false);
    setNewCatNom("");
  }

  async function handleSubmit() {
    if (!titre) return;
    setUploading(true);
    const piecesJointes: string[] = [];

    // Upload fichiers
    for (const file of fichiers) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/planning/upload", { method: "POST", body: formData });
      const { url } = await res.json();
      if (url) piecesJointes.push(url);
    }

    onCreateEvenement({
      titre, date, heure_debut: debut, heure_fin: fin,
      description, couleur, lieu, notes_internes: notesInternes,
      statut, visibilite, invite_email: inviteEmail,
      category_id: categoryId, pieces_jointes: piecesJointes,
    });
    setUploading(false);
  }

  const choices = [
    { key: "dispo", label: "Disponibilité", desc: "Créneau où vous êtes disponible", color: "bg-green-50 border-green-200 text-green-700" },
    { key: "evenement", label: "Événement", desc: "Bloc perso, formation, RDV...", color: "bg-blue-50 border-blue-200 text-blue-700" },
    { key: "indispo", label: "Indisponibilité", desc: "Congé, fermeture, absence...", color: "bg-orange-50 border-orange-200 text-orange-700" },
  ] as const;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">
              {type === "choix" ? "Créer" : type === "dispo" ? "Disponibilité" : type === "evenement" ? "Événement" : "Indisponibilité"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{dateLabel} à {heure}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {type === "choix" && (
            <div className="space-y-2">
              {choices.map(c => (
                <button key={c.key} onClick={() => setType(c.key)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${c.color} hover:opacity-80`}>
                  <div className="font-semibold text-sm">{c.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{c.desc}</div>
                </button>
              ))}
            </div>
          )}

          {type === "dispo" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Début</label>
                  <input type="time" value={dispoDebut} onChange={e => setDispoDebut(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Fin</label>
                  <input type="time" value={dispoFin} onChange={e => setDispoFin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setType("choix")} className="flex-1 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Retour</button>
                <button onClick={() => onCreateDispo(date, dispoDebut)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700">Créer</button>
              </div>
            </>
          )}

          {type === "evenement" && (
            <>
              {/* Titre + couleur */}
              <div className="flex gap-2">
                <div className="relative group/col flex-shrink-0">
                  <input type="color" value={couleur} onChange={e => { setCouleur(e.target.value); setCategoryId(null); }}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer opacity-0 absolute inset-0 z-10" />
                  <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center" style={{ backgroundColor: couleur }}>
                    <svg className="w-4 h-4 text-white opacity-0 group-hover/col:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
                <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
                  placeholder="Titre de l'événement" autoFocus
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>

              {/* Durées rapides */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Durée rapide</label>
                <div className="flex gap-1.5">
                  {[30, 60, 120, 240].map(m => (
                    <button key={m} onClick={() => setDuree(m)}
                      className="flex-1 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors text-gray-600">
                      {m < 60 ? `${m}min` : `${m/60}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heures */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Début</label>
                  <input type="time" value={debut} onChange={e => setDebut(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Fin</label>
                  <input type="time" value={fin} onChange={e => setFin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Catégorie</label>
                <div className="flex gap-2">
                  <select value={categoryId ?? ""} onChange={e => {
                    const cat = localCategories.find(c => c.id === e.target.value);
                    setCategoryId(e.target.value || null);
                    if (cat) setCouleur(cat.couleur);
                  }} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    <option value="">Sans catégorie</option>
                    {localCategories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  <button onClick={() => setShowNewCat(true)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0">+ Nouvelle</button>
                </div>
                {showNewCat && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input type="color" value={newCatCouleur} onChange={e => setNewCatCouleur(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-200 cursor-pointer flex-shrink-0" />
                    <input type="text" value={newCatNom} onChange={e => setNewCatNom(e.target.value)}
                      placeholder="Nom de la catégorie" autoFocus
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    <button onClick={handleCreateCategorie} className="text-xs font-bold text-blue-600 px-2">OK</button>
                    <button onClick={() => setShowNewCat(false)} className="text-xs text-gray-400 px-1">✕</button>
                  </div>
                )}
              </div>

              {/* Lieu */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Lieu</label>
                <div className="relative">
                  <input type="text" value={lieu} onChange={e => setLieu(e.target.value)}
                    placeholder="Adresse ou lieu"
                    className="w-full border border-gray-200 rounded-lg pl-3 pr-9 py-2 text-sm focus:outline-none focus:border-blue-400" />
                  {lieu && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(lieu)}`} target="_blank" rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Description publique */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Description visible par les invités" rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>

              {/* Notes internes */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Notes internes <span className="text-gray-400 font-normal">(privées)</span></label>
                <textarea value={notesInternes} onChange={e => setNotesInternes(e.target.value)}
                  placeholder="Notes visibles uniquement par vous" rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none bg-gray-50" />
              </div>

              {/* Statut + Visibilité */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Statut</label>
                  <select value={statut} onChange={e => setStatut(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    <option value="confirme">Confirmé</option>
                    <option value="tentative">Tentative</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Visibilité</label>
                  <select value={visibilite} onChange={e => setVisibilite(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    <option value="prive">Privé</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              {/* Invitation email */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Inviter par email</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>

              {/* Pièces jointes */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Pièces jointes</label>
                <input ref={fileRef} type="file" multiple className="hidden"
                  onChange={e => setFichiers(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  Cliquer pour ajouter des fichiers
                </button>
                {fichiers.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {fichiers.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => setFichiers(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setType("choix")} className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Retour</button>
                <button onClick={handleSubmit} disabled={!titre || uploading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? "Upload..." : "Créer"}
                </button>
              </div>
            </>
          )}

          {type === "indispo" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Du</label>
                  <input type="date" value={date} readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Au</label>
                  <input type="date" value={indispoFin} onChange={e => setIndispoFin(e.target.value)} min={date}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <input type="text" value={motif} onChange={e => setMotif(e.target.value)}
                placeholder="Motif (optionnel)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              <div className="flex gap-2">
                <button onClick={() => setType("choix")} className="flex-1 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Retour</button>
                <button onClick={() => onCreateIndispo(date, indispoFin, motif)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600">Créer</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Édition disponibilité ──────────────────────────────────────────────
function EditDispoModal({
  dispo, onClose, onDelete, onUpdate,
}: {
  dispo: Dispo;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, debut: string, fin: string) => void;
}) {
  const [debut, setDebut] = useState(dispo.heure_debut.slice(0, 5));
  const [fin, setFin] = useState(dispo.heure_fin.slice(0, 5));
  const JOURS_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Disponibilité</h3>
            <p className="text-xs text-gray-500">{JOURS_LONG[dispo.jour_semaine]} · chaque semaine</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Début</label>
              <input type="time" value={debut} onChange={e => setDebut(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Fin</label>
              <input type="time" value={fin} onChange={e => setFin(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onDelete(dispo.id)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50">
              Supprimer
            </button>
            <button onClick={() => onUpdate(dispo.id, debut, fin)}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Légende ────────────────────────────────────────────────────────────
function LegendModal({
  categories,
  setCategories,
  onClose,
}: {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onClose: () => void;
}) {
  // État local pour édition — copie des catégories
  const [draft, setDraft] = useState<Category[]>(() => JSON.parse(JSON.stringify(categories)));
  const [showAdd, setShowAdd] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newCouleur, setNewCouleur] = useState("#6366f1");
  const [loading, setLoading] = useState(false);

  const isDirty = JSON.stringify(draft.map(c => ({ id: c.id, nom: c.nom, couleur: c.couleur, visible: c.visible })))
    !== JSON.stringify(categories.map(c => ({ id: c.id, nom: c.nom, couleur: c.couleur, visible: c.visible })));

  function updateDraft(id: string, updates: Partial<Category>) {
    setDraft(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  async function handleSave() {
    setLoading(true);
    const changed = draft.filter(d => {
      const orig = categories.find(c => c.id === d.id);
      return orig && (orig.nom !== d.nom || orig.couleur !== d.couleur || orig.visible !== d.visible);
    });
    await Promise.all(changed.map(cat =>
      fetch("/api/planning/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: cat.id, nom: cat.nom, couleur: cat.couleur, visible: cat.visible }),
      })
    ));
    setCategories(draft);
    setLoading(false);
    onClose();
  }

  function handleCancel() {
    setDraft(JSON.parse(JSON.stringify(categories)));
  }

  async function deleteCategory(id: string) {
    await fetch("/api/planning/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setCategories(prev => prev.filter(c => c.id !== id));
    setDraft(prev => prev.filter(c => c.id !== id));
  }

  async function createCategory() {
    if (!newNom.trim()) return;
    setLoading(true);
    const res = await fetch("/api/planning/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", nom: newNom, couleur: newCouleur }),
    });
    const data = await res.json();
    setCategories(prev => [...prev, data]);
    setDraft(prev => [...prev, data]);
    setNewNom("");
    setNewCouleur("#6366f1");
    setShowAdd(false);
    setLoading(false);
  }

  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {open
        ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      }
    </svg>
  );

  const renderRow = (cat: Category, showDelete = false) => (
    <div key={cat.id} className="flex items-center gap-3 py-2">
      {/* Couleur avec crayon au survol */}
      <div className="relative group/color flex-shrink-0">
        <input
          type="color"
          value={cat.couleur}
          onChange={e => updateDraft(cat.id, { couleur: e.target.value })}
          className="w-7 h-7 rounded cursor-pointer border border-gray-200 opacity-0 absolute inset-0 z-10"
          title="Changer la couleur"
        />
        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: cat.couleur }}>
          <svg className="w-3 h-3 text-white opacity-0 group-hover/color:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>

      {/* Nom éditable */}
      <input
        type="text"
        value={cat.nom}
        onChange={e => updateDraft(cat.id, { nom: e.target.value })}
        className="flex-1 text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors min-w-0"
      />

      {/* Bouton oeil */}
      <button
        onClick={() => updateDraft(cat.id, { visible: !cat.visible })}
        className={`flex-shrink-0 transition-colors ${cat.visible ? "text-gray-400 hover:text-gray-600" : "text-gray-200 hover:text-gray-400"}`}
        title={cat.visible ? "Masquer" : "Afficher"}
      >
        <EyeIcon open={cat.visible} />
      </button>

      {/* Supprimer (custom seulement) */}
      {showDelete && (
        <button onClick={() => deleteCategory(cat.id)} className="flex-shrink-0 text-gray-200 hover:text-red-400 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Gérer la légende</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Catégories système</p>
          {draft.filter(c => c.is_system).map(cat => renderRow(cat, false))}

          {draft.filter(c => !c.is_system).length > 0 && (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-5 mb-3">Catégories personnalisées</p>
              {draft.filter(c => !c.is_system).map(cat => renderRow(cat, true))}
            </>
          )}

          {showAdd && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 mt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Nouvelle catégorie</p>
              <div className="flex gap-2">
                <input type="color" value={newCouleur} onChange={e => setNewCouleur(e.target.value)}
                  className="w-9 h-9 rounded border border-gray-200 cursor-pointer flex-shrink-0" />
                <input type="text" value={newNom} onChange={e => setNewNom(e.target.value)}
                  placeholder="Nom de la catégorie" autoFocus
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-100">Annuler</button>
                <button onClick={createCategory} disabled={!newNom.trim() || loading}
                  className="flex-1 py-1.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "..." : "Créer"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          <button onClick={() => { setShowAdd(true); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ajouter une catégorie
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={!isDirty}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Annuler les modifications
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal configuration disponibilités ──────────────────────────────────────
function DispoModal({
  userId, dispos, setDispos, onClose, showToast,
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

  const JOURS_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

  async function handleAdd() {
    if (form.jours.length === 0) { setError("Sélectionnez au moins un jour"); return; }
    if (toMin(form.fin) <= toMin(form.debut)) { setError("L'heure de fin doit être après le début"); return; }
    for (const j of form.jours) {
      const existing = dispos.filter(d => d.actif && d.jour_semaine === j);
      for (const e of existing) {
        const sameType = (e.type ?? "normal") === form.type;
        if (!sameType) continue;
        if (toMin(form.debut) < toMin(e.heure_fin) && toMin(form.fin) > toMin(e.heure_debut)) {
          setError(`Chevauchement le ${JOURS_LABELS[j]} avec ${e.heure_debut.slice(0,5)}–${e.heure_fin.slice(0,5)}`);
          return;
        }
      }
    }
    setLoading(true);
    setError(null);
    const rows = form.jours.map(j => ({ artisan_id: userId, jour_semaine: j, heure_debut: form.debut + ":00", heure_fin: form.fin + ":00", actif: true, type: form.type }));
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
    jour: i, label: JOURS_LABELS[i],
    dispos: dispos.filter(d => d.actif && d.jour_semaine === i).sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Mes disponibilités</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {grouped.map(g => (
            <div key={g.jour}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{g.label}</span>
                {g.dispos.length === 0 && <span className="text-[11px] text-gray-300 italic">Repos</span>}
              </div>
              <div className="space-y-1">
                {g.dispos.map(d => (
                  <div key={d.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm ${(d as any).type === "urgence" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
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
          {showAdd && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-bold text-gray-700">Nouveau créneau</p>
              <div className="grid grid-cols-7 gap-1">
                {["L","M","M","J","V","S","D"].map((l, i) => (
                  <button key={i} type="button"
                    onClick={() => setForm(f => ({ ...f, jours: f.jours.includes(i) ? f.jours.filter(j => j !== i) : [...f.jours, i] }))}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${form.jours.includes(i) ? "bg-blue-600 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-blue-300"}`}
                  >{l}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Début</label>
                  <input type="time" value={form.debut} onChange={e => setForm(f => ({ ...f, debut: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Fin</label>
                  <input type="time" value={form.fin} onChange={e => setForm(f => ({ ...f, fin: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
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
                <button onClick={handleAdd} disabled={loading} className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "..." : "Ajouter"}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={() => { setShowAdd(true); setError(null); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ajouter un créneau
          </button>
        </div>
      </div>
    </div>
  );
}
