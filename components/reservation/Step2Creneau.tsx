"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TService, TSlot } from "./ReservationTunnel";

// ─── Types locaux ──────────────────────────────────────────────────────────────

type Dispo = {
  id: string;
  jour_semaine: number;  // 0 = lundi … 6 = dimanche
  heure_debut: string;   // "HH:MM:SS"
  heure_fin: string;     // "HH:MM:SS"
};

type Indispo = {
  id: string;
  date_debut: string;    // "YYYY-MM-DD"
  date_fin: string;      // "YYYY-MM-DD"
};

type ExistingReservation = {
  date: string;          // "YYYY-MM-DD"
  heure_debut: string;   // "HH:MM:SS"
  heure_fin: string;     // "HH:MM:SS"
};

type DayInfo = {
  date: Date;
  iso: string;
  slots: TSlot[];
  reason: "past" | "indispo" | "closed" | "full" | "available";
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const MOIS = [
  "jan.", "fév.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sep.", "oct.", "nov.", "déc.",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retourne les 7 jours (lun→dim) de la semaine courante + offset. */
function getWeekDates(offsetWeeks: number): Date[] {
  const today = new Date();
  const dow = today.getDay(); // 0 = dimanche
  const mondayDelta = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayDelta + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Génère des créneaux toutes les 30 min avec une durée fixe. */
function generateSlots(debut: string, fin: string, dureeMins: number): TSlot[] {
  const start = timeToMinutes(debut);
  const end = timeToMinutes(fin);
  const slots: TSlot[] = [];
  for (let t = start; t + dureeMins <= end; t += 30) {
    slots.push({ debut: minutesToTime(t), fin: minutesToTime(t + dureeMins) });
  }
  return slots;
}

/** Vérifie si un créneau chevauche une réservation existante. */
function overlaps(slot: TSlot, r: ExistingReservation): boolean {
  const rD = r.heure_debut.slice(0, 5);
  const rF = r.heure_fin.slice(0, 5);
  return slot.debut < rF && slot.fin > rD;
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface Props {
  artisanId: string;
  service: TService;
  onSelect: (date: string, slot: TSlot) => void;
  onBack: () => void;
}

export default function Step2Creneau({ artisanId, service, onSelect, onBack }: Props) {
  const supabase = createClient();
  const dureeMins = service.duree_minutes ?? 60;

  // ── State ────────────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispos, setDispos] = useState<Dispo[]>([]);
  const [indispos, setIndispos] = useState<Indispo[]>([]);
  const [reservations, setReservations] = useState<ExistingReservation[]>([]);

  // ── Week dates ────────────────────────────────────────────────────────────
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectedDayIdx(null);
    setSelectedSlot(null);

    const weekStart = toISODate(weekDates[0]);
    const weekEnd = toISODate(weekDates[6]);

    const [dispoRes, indispoRes, resaRes] = await Promise.all([
      supabase
        .from("disponibilites")
        .select("id, jour_semaine, heure_debut, heure_fin")
        .eq("artisan_id", artisanId)
        .eq("actif", true),

      supabase
        .from("indisponibilites")
        .select("id, date_debut, date_fin")
        .eq("artisan_id", artisanId)
        .lte("date_debut", weekEnd)
        .gte("date_fin", weekStart),

      supabase
        .from("reservations")
        .select("date, heure_debut, heure_fin")
        .eq("artisan_id", artisanId)
        .gte("date", weekStart)
        .lte("date", weekEnd)
        .not("statut", "eq", "annule"),
    ]);

    setDispos((dispoRes.data ?? []) as Dispo[]);
    setIndispos((indispoRes.data ?? []) as Indispo[]);
    setReservations((resaRes.data ?? []) as ExistingReservation[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, artisanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Calcul créneaux disponibles par jour ──────────────────────────────────
  const dayInfos = useMemo<DayInfo[]>(() => {
    const now = new Date();

    return weekDates.map((date, idx) => {
      const iso = toISODate(date);

      // Jour passé
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      if (endOfDay < now) {
        return { date, iso, slots: [], reason: "past" };
      }

      // Indisponibilité
      const isIndispo = indispos.some((i) => i.date_debut <= iso && i.date_fin >= iso);
      if (isIndispo) {
        return { date, iso, slots: [], reason: "indispo" };
      }

      // Pas de disponibilité ce jour
      const dispo = dispos.find((d) => d.jour_semaine === idx);
      if (!dispo) {
        return { date, iso, slots: [], reason: "closed" };
      }

      // Génère les créneaux et filtre les passés + les déjà réservés
      const allSlots = generateSlots(dispo.heure_debut, dispo.heure_fin, dureeMins);
      const dayResa = reservations.filter((r) => r.date === iso);

      const available = allSlots.filter((slot) => {
        const slotDT = new Date(`${iso}T${slot.debut}:00`);
        if (slotDT <= now) return false;
        return !dayResa.some((r) => overlaps(slot, r));
      });

      return {
        date,
        iso,
        slots: available,
        reason: available.length === 0 ? "full" : "available",
      };
    });
  }, [weekDates, dispos, indispos, reservations, dureeMins]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleDayClick(idx: number) {
    if (dayInfos[idx].reason !== "available") return;
    setSelectedDayIdx((prev) => (prev === idx ? null : idx));
    setSelectedSlot(null);
  }

  function handleConfirm() {
    if (selectedDayIdx === null || !selectedSlot) return;
    onSelect(dayInfos[selectedDayIdx].iso, selectedSlot);
  }

  const selectedDayInfo = selectedDayIdx !== null ? dayInfos[selectedDayIdx] : null;

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Retour à l'étape précédente"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Choisissez un créneau</h1>
      </div>

      {/* Sous-titre avec service sélectionné */}
      <p className="text-sm text-gray-500 mb-6 ml-9">
        <span className="font-medium text-gray-700">{service.titre}</span>
        {service.duree_minutes && (
          <>
            {" · "}
            <span>
              {service.duree_minutes < 60
                ? `${service.duree_minutes} min`
                : service.duree_minutes % 60 === 0
                ? `${service.duree_minutes / 60}h`
                : `${Math.floor(service.duree_minutes / 60)}h${String(service.duree_minutes % 60).padStart(2, "0")}`}
            </span>
          </>
        )}
      </p>

      {/* Navigation semaine */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          disabled={weekOffset === 0}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Semaine précédente"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-sm font-medium text-gray-600">
          {weekDates[0].getDate()} {MOIS[weekDates[0].getMonth()]}
          {" – "}
          {weekDates[6].getDate()} {MOIS[weekDates[6].getMonth()]} {weekDates[6].getFullYear()}
        </span>

        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Semaine suivante"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grille des jours */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1.5 mb-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 mb-6" role="group" aria-label="Jours de la semaine">
          {dayInfos.map((info, i) => {
            const isSelected = selectedDayIdx === i;
            const isAvail = info.reason === "available";

            return (
              <button
                key={i}
                onClick={() => handleDayClick(i)}
                disabled={!isAvail}
                aria-pressed={isSelected}
                aria-label={`${JOURS_COURTS[i]} ${info.date.getDate()} – ${info.reason === "available" ? `${info.slots.length} créneau(x)` : info.reason}`}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all text-center leading-tight ${
                  isSelected
                    ? "border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-200"
                    : isAvail
                    ? "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50 cursor-pointer"
                    : "border-transparent bg-gray-50 cursor-not-allowed"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? "text-brand-100" : isAvail ? "text-gray-400" : "text-gray-300"}`}>
                  {JOURS_COURTS[i]}
                </span>
                <span className={`text-lg font-bold ${isSelected ? "text-white" : isAvail ? "text-gray-800" : "text-gray-300"}`}>
                  {info.date.getDate()}
                </span>
                <span className={`text-[9px] font-medium mt-0.5 ${
                  isSelected
                    ? "text-brand-100"
                    : info.reason === "available"
                    ? "text-brand-600"
                    : info.reason === "past"
                    ? "text-gray-200"
                    : "text-gray-300"
                }`}>
                  {info.reason === "past"
                    ? ""
                    : info.reason === "indispo"
                    ? "Congé"
                    : info.reason === "closed"
                    ? "Fermé"
                    : info.reason === "full"
                    ? "Complet"
                    : `${info.slots.length} slot${info.slots.length > 1 ? "s" : ""}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Créneaux horaires du jour sélectionné */}
      {selectedDayInfo && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Créneaux disponibles —{" "}
            <span className="text-brand-600">
              {JOURS_COURTS[selectedDayIdx!]} {selectedDayInfo.date.getDate()} {MOIS[selectedDayInfo.date.getMonth()]}
            </span>
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {selectedDayInfo.slots.map((slot) => {
              const isSel = selectedSlot?.debut === slot.debut;
              return (
                <button
                  key={slot.debut}
                  onClick={() => setSelectedSlot(slot)}
                  aria-pressed={isSel}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    isSel
                      ? "border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-200"
                      : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50 text-gray-700"
                  }`}
                >
                  {slot.debut}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hint : aucun jour sélectionné */}
      {!loading && selectedDayIdx === null && (
        <p className="text-center text-sm text-gray-400 py-3">
          Cliquez sur un jour disponible pour voir les créneaux.
        </p>
      )}

      {/* Bouton suivant */}
      <button
        onClick={handleConfirm}
        disabled={!selectedSlot}
        className="w-full mt-2 py-3.5 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {selectedSlot && selectedDayInfo
          ? `Continuer – ${JOURS_COURTS[selectedDayIdx!]} ${selectedDayInfo.date.getDate()} ${MOIS[selectedDayInfo.date.getMonth()]} à ${selectedSlot.debut}`
          : "Sélectionnez un créneau pour continuer"}
      </button>
    </div>
  );
}
