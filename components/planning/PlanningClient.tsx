"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types locaux (évite l'inférence "never" de Supabase) ────────────────────

type Dispo = {
  id: string;
  artisan_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  actif: boolean;
  created_at: string;
};

type Indispo = {
  id: string;
  artisan_id: string;
  date_debut: string;
  date_fin: string;
  motif: string | null;
  created_at: string;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const JOURS = [
  { id: 0, court: "Lun", long: "Lundi" },
  { id: 1, court: "Mar", long: "Mardi" },
  { id: 2, court: "Mer", long: "Mercredi" },
  { id: 3, court: "Jeu", long: "Jeudi" },
  { id: 4, court: "Ven", long: "Vendredi" },
  { id: 5, court: "Sam", long: "Samedi" },
  { id: 6, court: "Dim", long: "Dimanche" },
] as const;

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function dureeHeures(debut: string, fin: string): number {
  const [hd, md] = debut.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  return Math.max(0, (hf * 60 + mf - (hd * 60 + md)) / 60);
}

function formatHeure(time: string): string {
  return time.slice(0, 5); // "09:00:00" → "09:00"
}

function getWeekDates(offsetWeeks = 0): Date[] {
  const today = new Date();
  const dow = today.getDay(); // 0=dim
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso + "T00:00:00"));
}

function formatDateFull(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

// ─── Icônes inline ────────────────────────────────────────────────────────────

function IconPlus({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconTrash({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconClock({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconCalendar({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconX({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Composant : carte de créneau ─────────────────────────────────────────────

function SlotCard({
  dispo,
  onDelete,
  loading,
}: {
  dispo: Dispo;
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  const duree = dureeHeures(dispo.heure_debut, dispo.heure_fin);
  return (
    <div className="group relative bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-2 text-xs">
      <div className="font-bold text-brand-800 tabular-nums">
        {formatHeure(dispo.heure_debut)} – {formatHeure(dispo.heure_fin)}
      </div>
      <div className="text-brand-600 mt-0.5 flex items-center gap-1">
        <IconClock className="w-3 h-3" />
        {duree % 1 === 0 ? `${duree}h` : `${Math.floor(duree)}h${Math.round((duree % 1) * 60)}`}
      </div>
      {/* Bouton supprimer */}
      <button
        onClick={() => onDelete(dispo.id)}
        disabled={loading}
        title="Supprimer ce créneau"
        className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 text-brand-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
      >
        {loading ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <IconTrash />
        )}
      </button>
    </div>
  );
}

// ─── Composant : colonne d'un jour ────────────────────────────────────────────

function DayColumn({
  jour,
  date,
  dispos,
  indispoActive,
  onAddClick,
  onDelete,
  loadingId,
}: {
  jour: (typeof JOURS)[number];
  date: Date;
  dispos: Dispo[];
  indispoActive: boolean;
  onAddClick: (jourId: number) => void;
  onDelete: (id: string) => void;
  loadingId: string | null;
}) {
  const isToday = toISODate(date) === toISODate(new Date());
  const totalH = dispos.reduce(
    (acc, d) => acc + dureeHeures(d.heure_debut, d.heure_fin),
    0
  );

  return (
    <div
      className={`flex flex-col gap-2 min-w-[130px] flex-1 rounded-xl border-2 p-3 transition-colors ${
        indispoActive
          ? "border-orange-200 bg-orange-50"
          : isToday
          ? "border-brand-300 bg-brand-50/30"
          : "border-gray-100 bg-white"
      }`}
    >
      {/* En-tête du jour */}
      <div className="text-center">
        <div
          className={`text-xs font-bold uppercase tracking-wider ${
            isToday ? "text-brand-600" : "text-gray-500"
          }`}
        >
          {jour.court}
        </div>
        <div
          className={`text-lg font-black leading-tight ${
            isToday ? "text-brand-700" : "text-gray-800"
          }`}
        >
          {date.getDate()}
        </div>
        {isToday && (
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mx-auto mt-0.5" />
        )}
        {/* Indispo badge */}
        {indispoActive && (
          <span className="mt-1 inline-block text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
            Indispo
          </span>
        )}
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-1.5 flex-1">
        {dispos.length === 0 && !indispoActive && (
          <div className="flex-1 flex items-center justify-center py-2">
            <span className="text-[11px] text-gray-300 italic">Repos</span>
          </div>
        )}
        {dispos.map((d) => (
          <SlotCard
            key={d.id}
            dispo={d}
            onDelete={onDelete}
            loading={loadingId === d.id}
          />
        ))}
      </div>

      {/* Résumé heures + bouton ajouter */}
      {totalH > 0 && (
        <div className="text-center text-[11px] font-semibold text-brand-600">
          {totalH % 1 === 0 ? totalH : totalH.toFixed(1)}h
        </div>
      )}
      <button
        onClick={() => onAddClick(jour.id)}
        className="flex items-center justify-center gap-1 w-full py-1.5 text-xs font-semibold text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg border border-dashed border-gray-200 hover:border-brand-300 transition-all"
      >
        <IconPlus className="w-3 h-3" />
        Créneau
      </button>
    </div>
  );
}

// ─── Composant : Modal ajout créneau ──────────────────────────────────────────

function AddSlotModal({
  jourId,
  onClose,
  onSave,
  loading,
  error,
}: {
  jourId: number;
  onClose: () => void;
  onSave: (data: { jours: number[]; heure_debut: string; heure_fin: string }) => void;
  loading: boolean;
  error: string | null;
}) {
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("17:00");
  const jour = JOURS[jourId];

  const duree = dureeHeures(heureDebut, heureFin);
  const isValid = duree > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSave({ jours: selectedJours, heure_debut: heureDebut, heure_fin: heureFin });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Nouveau créneau
            </h3>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-brand-600">{selectedJours.map(id => JOURS[id].court).join(", ")}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Jour (lecture seule) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
              Jour
            </label>
            <div className="grid grid-cols-7 gap-1">
              {JOURS.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => toggleJour(j.id)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedJours.includes(j.id)
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {j.court}
                </button>
              ))}
            </div>
          </div>

          {/* Heures */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Début
              </label>
              <input
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Fin
              </label>
              <input
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview durée */}
          {isValid ? (
            <div className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 text-sm text-brand-700 flex items-center gap-2">
              <IconClock className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span>
                Durée :{" "}
                <strong>
                  {duree % 1 === 0
                    ? `${duree}h`
                    : `${Math.floor(duree)}h${Math.round((duree % 1) * 60)}`}
                </strong>
                {" "}· de {heureDebut} à {heureFin}
              </span>
            </div>
          ) : (
            heureDebut && heureFin && (
              <p className="text-xs text-red-500">
                L&apos;heure de fin doit être après l&apos;heure de début.
              </p>
            )
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <IconPlus />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Composant : carte indisponibilité ───────────────────────────────────────

function IndispoCard({
  indispo,
  onDelete,
  loading,
}: {
  indispo: Indispo;
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  const debut = formatDateFull(indispo.date_debut);
  const fin = formatDateFull(indispo.date_fin);
  const isSameDay = indispo.date_debut === indispo.date_fin;

  // Compute number of days
  const ms =
    new Date(indispo.date_fin + "T00:00:00").getTime() -
    new Date(indispo.date_debut + "T00:00:00").getTime();
  const jours = Math.round(ms / 86400000) + 1;

  return (
    <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-orange-900">
          {isSameDay
            ? debut
            : `Du ${formatDateShort(indispo.date_debut)} au ${formatDateShort(indispo.date_fin)}`}
        </p>
        <p className="text-xs text-orange-600 mt-0.5">
          {jours} jour{jours > 1 ? "s" : ""}
          {indispo.motif ? ` · ${indispo.motif}` : ""}
        </p>
      </div>
      <button
        onClick={() => onDelete(indispo.id)}
        disabled={loading}
        className="p-1.5 rounded-lg text-orange-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40 flex-shrink-0"
        title="Supprimer cette période"
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <IconTrash className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

// ─── Composant principal : PlanningClient ────────────────────────────────────

interface PlanningClientProps {
  userId: string;
  initialDispos: Dispo[];
  initialIndispos: Indispo[];
}

export default function PlanningClient({
  userId,
  initialDispos,
  initialIndispos,
}: PlanningClientProps) {
  const supabase = createClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [dispos, setDispos] = useState<Dispo[]>(initialDispos);
  const [indispos, setIndispos] = useState<Indispo[]>(initialIndispos);
  const [weekOffset, setWeekOffset] = useState(0);

  // Modal ajout créneau
  const [modalJour, setModalJour] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Chargement suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Formulaire indisponibilité
  const [showIndispoForm, setShowIndispoForm] = useState(false);
  const [indispoForm, setIndispoForm] = useState({
    dateDebut: "",
    dateFin: "",
    motif: "",
  });
  const [indispoLoading, setIndispoLoading] = useState(false);
  const [indispoError, setIndispoError] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Semaine affichée ───────────────────────────────────────────────────────
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => {
    const d0 = weekDates[0];
    const d6 = weekDates[6];
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(d);
    return `${fmt(d0)} – ${fmt(d6)} ${d6.getFullYear()}`;
  }, [weekDates]);

  // ── Jours indisponibles cette semaine ─────────────────────────────────────
  const joursIndispoSet = useMemo(() => {
    const set = new Set<number>();
    const weekStart = toISODate(weekDates[0]);
    const weekEnd = toISODate(weekDates[6]);
    indispos.forEach((i) => {
      if (i.date_debut <= weekEnd && i.date_fin >= weekStart) {
        weekDates.forEach((date, idx) => {
          const iso = toISODate(date);
          if (iso >= i.date_debut && iso <= i.date_fin) set.add(idx);
        });
      }
    });
    return set;
  }, [indispos, weekDates]);

  // ── Calcul heures semaine ─────────────────────────────────────────────────
  const { totalHeuresSemaine, joursActifs } = useMemo(() => {
    let total = 0;
    const actifs = new Set<number>();
    dispos.forEach((d) => {
      if (!joursIndispoSet.has(d.jour_semaine)) {
        total += dureeHeures(d.heure_debut, d.heure_fin);
        actifs.add(d.jour_semaine);
      }
    });
    return { totalHeuresSemaine: total, joursActifs: actifs.size };
  }, [dispos, joursIndispoSet]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`planning-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "disponibilites",
          filter: `artisan_id=eq.${userId}`,
        },
        (payload) => {
          const newD = payload.new as Dispo;
          setDispos((prev) =>
            [...prev, newD].sort(
              (a, b) => a.jour_semaine - b.jour_semaine || a.heure_debut.localeCompare(b.heure_debut)
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "disponibilites",
          filter: `artisan_id=eq.${userId}`,
        },
        (payload) => {
          setDispos((prev) => prev.filter((d) => d.id !== (payload.old as Dispo).id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "indisponibilites",
          filter: `artisan_id=eq.${userId}`,
        },
        (payload) => {
          setIndispos((prev) =>
            [...prev, payload.new as Indispo].sort((a, b) =>
              a.date_debut.localeCompare(b.date_debut)
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "indisponibilites",
          filter: `artisan_id=eq.${userId}`,
        },
        (payload) => {
          setIndispos((prev) =>
            prev.filter((i) => i.id !== (payload.old as Indispo).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // ── Actions Supabase ──────────────────────────────────────────────────────

  async function addDispo(data: {
    jours: number[];
    heure_debut: string;
    heure_fin: string;
  }) {
    setModalLoading(true);
    setModalError(null);
    const rows = data.jours.map((jour_semaine) => ({
      artisan_id: userId,
      jour_semaine,
      heure_debut: data.heure_debut,
      heure_fin: data.heure_fin,
      actif: true,
    }));
    const { data: inserted, error } = await supabase
      .from("disponibilites")
      // @ts-expect-error
      .insert(rows)
      .select();
    if (error) {
      setModalError(
        error.code === "23514"
          ? "L'heure de fin doit être après l'heure de début."
          : error.message
      );
    } else if (inserted) {
      setDispos((prev) =>
        [...prev, ...(inserted as Dispo[])].sort(
          (a, b) => a.jour_semaine - b.jour_semaine || a.heure_debut.localeCompare(b.heure_debut)
        )
      );
      setModalJour(null);
      showToast("Créneau ajouté", "success");
    }
    setModalLoading(false);
  }
    setModalLoading(false);
  }

  async function deleteDispo(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("disponibilites").delete().eq("id", id);
    if (error) {
      showToast("Erreur lors de la suppression.", "error");
    } else {
      setDispos((prev) => prev.filter((d) => d.id !== id));
      showToast("Créneau supprimé.", "success");
    }
    setDeletingId(null);
  }

  async function addIndispo() {
    if (!indispoForm.dateDebut || !indispoForm.dateFin) return;
    if (indispoForm.dateFin < indispoForm.dateDebut) {
      setIndispoError("La date de fin doit être après la date de début.");
      return;
    }

    setIndispoLoading(true);
    setIndispoError(null);

    const { data: inserted, error } = await supabase
      .from("indisponibilites")
      // @ts-expect-error – @supabase/ssr@0.5.x / supabase-js@2.98.x generic mismatch
      .insert({
        artisan_id: userId,
        date_debut: indispoForm.dateDebut,
        date_fin: indispoForm.dateFin,
        motif: indispoForm.motif.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setIndispoError(error.message);
    } else if (inserted) {
      setIndispos((prev) =>
        [...prev, inserted as Indispo].sort((a, b) =>
          a.date_debut.localeCompare(b.date_debut)
        )
      );
      setIndispoForm({ dateDebut: "", dateFin: "", motif: "" });
      setShowIndispoForm(false);
      showToast("Indisponibilité enregistrée", "success");
    }
    setIndispoLoading(false);
  }

  async function deleteIndispo(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("indisponibilites").delete().eq("id", id);
    if (error) {
      showToast("Erreur lors de la suppression.", "error");
    } else {
      setIndispos((prev) => prev.filter((i) => i.id !== id));
      showToast("Période supprimée.", "success");
    }
    setDeletingId(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8">

      {/* ── Toast notification ──────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border transition-all ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          
          {toast.msg}
        </div>
      )}

      {/* ── Modal ajout créneau ─────────────────────────────────────────────── */}
      {modalJour !== null && (
        <AddSlotModal
          jourId={modalJour}
          onClose={() => {
            setModalJour(null);
            setModalError(null);
          }}
          onSave={addDispo}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900">Mon planning</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez vos créneaux de disponibilité et vos congés.
          </p>
        </div>
        <button
          onClick={() => setShowIndispoForm(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <IconCalendar />
          Ajouter une indisponibilité
        </button>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: "",
            label: "Cette semaine",
            value:
              totalHeuresSemaine === 0
                ? "—"
                : `${totalHeuresSemaine % 1 === 0 ? totalHeuresSemaine : totalHeuresSemaine.toFixed(1)} h`,
            sub: "heures disponibles",
            color: "bg-brand-50 border-brand-100",
            textColor: "text-brand-700",
          },
          {
            icon: "",
            label: "Jours actifs",
            value: joursActifs,
            sub: "jours / 7",
            color: "bg-blue-50 border-blue-100",
            textColor: "text-blue-700",
          },
          {
            icon: "",
            label: "Créneaux total",
            value: dispos.length,
            sub: "sur la semaine type",
            color: "bg-purple-50 border-purple-100",
            textColor: "text-purple-700",
          },
          {
            icon: "",
            label: "Congés / indispos",
            value: indispos.length,
            sub: "à venir",
            color: "bg-orange-50 border-orange-100",
            textColor: "text-orange-700",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border p-4 ${kpi.color}`}
          >
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className={`text-2xl font-black ${kpi.textColor}`}>
              {kpi.value}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.sub}</div>
            <div className="text-[11px] font-semibold text-gray-400 mt-0.5">
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Grille hebdomadaire ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Header section */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            
            Disponibilités hebdomadaires
          </h2>
          {/* Navigation semaine */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <IconChevronLeft />
            </button>
            <span className="font-semibold text-gray-700 min-w-[220px] text-center text-xs sm:text-sm">
              {weekLabel}
            </span>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <IconChevronRight />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
              >
                Aujourd&apos;hui
              </button>
            )}
          </div>
        </div>

        {/* Note récurrence */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4 text-xs text-blue-700">
          
          <span>
            Le planning hebdomadaire est <strong>récurrent</strong> : les créneaux
            s&apos;appliquent toutes les semaines. Utilisez les indisponibilités pour
            bloquer des jours ponctuels.
          </span>
        </div>

        {/* Grille 7 colonnes — scroll horizontal sur mobile */}
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="flex gap-2.5 min-w-[840px] pb-1">
            {JOURS.map((jour, idx) => {
              const dayDispos = dispos.filter((d) => d.jour_semaine === jour.id);
              return (
                <DayColumn
                  key={jour.id}
                  jour={jour}
                  date={weekDates[idx]}
                  dispos={dayDispos}
                  indispoActive={joursIndispoSet.has(idx)}
                  onAddClick={(id) => {
                    setModalJour(id);
                    setModalError(null);
                  }}
                  onDelete={deleteDispo}
                  loadingId={deletingId}
                />
              );
            })}
          </div>
        </div>

        {/* Empty state global */}
        {dispos.length === 0 && (
          <div className="text-center py-8 mt-4 border-t border-gray-50">
            
            <p className="text-sm font-semibold text-gray-600 mb-1">
              Aucune disponibilité renseignée
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Cliquez sur &ldquo;+ Créneau&rdquo; dans un jour pour commencer.
            </p>
          </div>
        )}
      </div>

      {/* ── Section indisponibilités ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            
            Congés &amp; indisponibilités
            {indispos.length > 0 && (
              <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                {indispos.length}
              </span>
            )}
          </h2>
          {!showIndispoForm && (
            <button
              onClick={() => setShowIndispoForm(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-all"
            >
              <IconPlus className="w-3.5 h-3.5" />
              Nouvelle période
            </button>
          )}
        </div>

        {/* Formulaire d'ajout */}
        {showIndispoForm && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-orange-900">
                Nouvelle période d&apos;indisponibilité
              </h3>
              <button
                onClick={() => {
                  setShowIndispoForm(false);
                  setIndispoError(null);
                  setIndispoForm({ dateDebut: "", dateFin: "", motif: "" });
                }}
                className="text-orange-400 hover:text-orange-600 transition-colors"
              >
                <IconX />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-orange-800 block mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={indispoForm.dateDebut}
                  onChange={(e) =>
                    setIndispoForm((f) => ({ ...f, dateDebut: e.target.value }))
                  }
                  min={toISODate(new Date())}
                  className="w-full border border-orange-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-orange-800 block mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={indispoForm.dateFin}
                  onChange={(e) =>
                    setIndispoForm((f) => ({ ...f, dateFin: e.target.value }))
                  }
                  min={indispoForm.dateDebut || toISODate(new Date())}
                  className="w-full border border-orange-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-orange-800 block mb-1">
                  Motif (optionnel)
                </label>
                <input
                  type="text"
                  value={indispoForm.motif}
                  onChange={(e) =>
                    setIndispoForm((f) => ({ ...f, motif: e.target.value }))
                  }
                  placeholder="Vacances, Férié…"
                  className="w-full border border-orange-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
            </div>

            {indispoError && (
              <p className="mt-2 text-xs text-red-600">{indispoError}</p>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowIndispoForm(false);
                  setIndispoError(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addIndispo}
                disabled={
                  !indispoForm.dateDebut || !indispoForm.dateFin || indispoLoading
                }
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {indispoLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <IconPlus className="w-4 h-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        )}

        {/* Liste des indisponibilités */}
        {indispos.length === 0 ? (
          <div className="text-center py-8">
            
            <p className="text-sm font-semibold text-gray-600 mb-1">
              Aucune indisponibilité planifiée
            </p>
            <p className="text-xs text-gray-400">
              Vous êtes disponible selon votre planning hebdomadaire.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {indispos.map((i) => (
              <IndispoCard
                key={i.id}
                indispo={i}
                onDelete={deleteIndispo}
                loading={deletingId === i.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
