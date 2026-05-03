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

type CalEvent = {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  titre: string;
  couleur: string;
  type: "dispo" | "indispo" | "resa";
  raw: Dispo | Indispo | Reservation;
  isBg?: boolean;
};

type View = "jour" | "semaine" | "mois" | "liste";

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
  const [showDispoModal, setShowDispoModal] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("planning_colors");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; heure: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = toISO(new Date());
  const weekDates = getWeekDates(currentDate);

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
                  className={`flex-1 relative border-l border-gray-100 ${isT ? "bg-blue-50/20" : ""}`}
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
                    const totalMin = Math.floor(y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
                    const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
                    const m = String(totalMin % 60).padStart(2, "0");
                    setQuickAdd({ date: iso, heure: `${h}:${m}` });
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

                  {/* Disponibilités en background */}
                  {events.filter(e => e.date === iso && e.type === "dispo").map(ev => (
                    <div key={ev.id}
                      className="absolute inset-x-0 pointer-events-none z-0 opacity-30"
                      style={{
                        top: `${topPx(ev.heure_debut)}px`,
                        height: `${heightPx(ev.heure_debut, ev.heure_fin)}px`,
                        backgroundColor: (ev.couleur === "red" ? colors.urgence : colors.dispo) + "40",
                        borderLeft: `3px solid ${ev.couleur === "red" ? colors.urgence : colors.dispo}`,
                      }}
                    />
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
                          className="absolute rounded-lg border px-1.5 py-0.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity z-10"
                          style={{ top: `${top}px`, height: `${height}px`, left, width, backgroundColor: c.bg.includes("[") ? undefined : undefined, borderColor: "transparent" }}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                        >
                          <div className="text-[10px] font-bold truncate leading-tight" style={{ color: ev.couleur === "brand" ? "white" : colors[ev.couleur === "blue" ? "confirme" : ev.couleur === "amber" ? "en_attente" : "en_cours"] }}>{ev.titre}</div>
                          {height > 30 && <div className="text-[9px] opacity-75 truncate" style={{ color: ev.couleur === "brand" ? "white" : colors[ev.couleur === "blue" ? "confirme" : ev.couleur === "amber" ? "en_attente" : "en_cours"] }}>{fmt(ev.heure_debut)}–{fmt(ev.heure_fin)}</div>}
                        </div>
                      );
                    })
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
              setQuickAdd({ date: iso, heure: `${h}:${m}` });
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
                  {JOURS_FERIES[ev.date] && <span className="ml-2 text-green-600 normal-case">{JOURS_FERIES[ev.date]}</span>}
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
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Légende</p>
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">
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

        {/* Google */}
        {googleCalendarConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Google
          </span>
        ) : (
          <a href="/api/auth/google-calendar" className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </a>
        )}

        {/* Légende */}
        <button onClick={() => setShowLegendModal(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Personnaliser les couleurs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
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

      {/* ── Pop-up ajout rapide ───────────────────────────────────────────── */}
      {quickAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setQuickAdd(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">Ajouter une disponibilité</h3>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(quickAdd.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {quickAdd.heure}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setQuickAdd(null)} className="flex-1 py-2 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={() => addQuickSlot(quickAdd.date, quickAdd.heure)} className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                Ajouter 1h
              </button>
            </div>
          </div>
        </div>
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

      {/* ── Modal légende ───────────────────────────────────────────────── */}
      {showLegendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowLegendModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">Personnaliser les couleurs</h3>
            <div className="space-y-3">
              {[
                { key: "confirme", label: "Réservation confirmée" },
                { key: "en_cours", label: "En cours" },
                { key: "en_attente", label: "En attente" },
                { key: "dispo", label: "Disponible" },
                { key: "urgence", label: "Urgence" },
                { key: "indispo", label: "Indisponible" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => {
                      const newColors = { ...customColors, [key]: e.target.value };
                      setCustomColors(newColors);
                      localStorage.setItem("planning_colors", JSON.stringify(newColors));
                    }}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setCustomColors({}); localStorage.removeItem("planning_colors"); }} className="flex-1 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Réinitialiser</button>
              <button onClick={() => setShowLegendModal(false)} className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700">Fermer</button>
            </div>
          </div>
        </div>
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
