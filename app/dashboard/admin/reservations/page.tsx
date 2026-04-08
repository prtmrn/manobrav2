"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const STATUTS = ["en_attente", "confirme", "en_cours", "termine", "annule"];
const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "text-amber-400 bg-amber-900/30 border-amber-800" },
  confirme:   { label: "Confirmé",   color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  en_cours:   { label: "En cours",   color: "text-brand-400 bg-brand-900/30 border-brand-800" },
  termine:    { label: "Terminé",    color: "text-green-400 bg-green-900/30 border-green-800" },
  annule:     { label: "Annulé",     color: "text-gray-400 bg-gray-800/30 border-gray-700" },
};

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtEuro(n: number | null) {
  if (!n) return "N/A";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);
}

function getDateRange(periode: string): { start: string; end: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const startOfWeek = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  switch (periode) {
    case "hier":      return { start: fmt(addDays(today, -1)), end: fmt(addDays(today, -1)) };
    case "today":     return { start: fmt(today), end: fmt(today) };
    case "demain":    return { start: fmt(addDays(today, 1)), end: fmt(addDays(today, 1)) };
    case "semaine_derniere": {
      const s = startOfWeek(addDays(today, -7));
      return { start: fmt(s), end: fmt(addDays(s, 6)) };
    }
    case "cette_semaine": {
      const s = startOfWeek(today);
      return { start: fmt(s), end: fmt(addDays(s, 6)) };
    }
    case "semaine_prochaine": {
      const s = startOfWeek(addDays(today, 7));
      return { start: fmt(s), end: fmt(addDays(s, 6)) };
    }
    case "mois_dernier": {
      const s = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      return { start: fmt(s), end: fmt(endOfMonth(s)) };
    }
    case "ce_mois":   return { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) };
    case "mois_prochain": {
      const s = startOfMonth(new Date(today.getFullYear(), today.getMonth() + 1, 1));
      return { start: fmt(s), end: fmt(endOfMonth(s)) };
    }
    case "7_jours":   return { start: fmt(addDays(today, -7)), end: fmt(today) };
    default:          return null;
  }
}

const PERIODES = [
  { value: "", label: "Toutes les périodes" },
  { value: "hier", label: "Hier" },
  { value: "today", label: "Aujourd'hui" },
  { value: "demain", label: "Demain" },
  { value: "semaine_derniere", label: "La semaine dernière" },
  { value: "cette_semaine", label: "Cette semaine" },
  { value: "semaine_prochaine", label: "La semaine prochaine" },
  { value: "mois_dernier", label: "Le mois dernier" },
  { value: "ce_mois", label: "Ce mois-ci" },
  { value: "mois_prochain", label: "Le mois prochain" },
  { value: "7_jours", label: "Les 7 derniers jours" },
  { value: "custom", label: "Choisir les dates" },
];

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreArtisan, setFiltreArtisan] = useState("");
  const [filtreMetier, setFiltreMetier] = useState("");
  const [filtreVille, setFiltreVille] = useState("");
  const [filtrePeriode, setFiltrePeriode] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("reservations")
        .select("id, date, heure_debut, heure_fin, statut, montant_total, created_at, client_id, artisan_id, guest_nom, guest_email, adresse_intervention, services!service_id(titre), profiles_artisans!artisan_id(nom, prenom, metier, ville), profiles_clients!client_id(nom, prenom)")
        .order("date", { ascending: false })
        .limit(500);
      setReservations(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const artisans = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reservations) {
      const a = r.profiles_artisans;
      if (a && r.artisan_id) map.set(r.artisan_id, `${a.prenom ?? ""} ${a.nom ?? ""}`.trim());
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [reservations]);

  const metiers = useMemo(() => {
    const set = new Set<string>();
    for (const r of reservations) {
      const m = r.profiles_artisans?.metier;
      if (m) { if (Array.isArray(m)) m.forEach((x: string) => set.add(x)); else set.add(m); }
    }
    return Array.from(set).sort();
  }, [reservations]);

  const villes = useMemo(() => {
    const set = new Set<string>();
    for (const r of reservations) {
      const v = r.profiles_artisans?.ville;
      if (v) set.add(v);
    }
    return Array.from(set).sort();
  }, [reservations]);

  const filtered = useMemo(() => {
    let list = [...reservations];
    if (filtreStatut) list = list.filter(r => r.statut === filtreStatut);
    if (filtreArtisan) list = list.filter(r => r.artisan_id === filtreArtisan);
    if (filtreMetier) list = list.filter(r => {
      const m = r.profiles_artisans?.metier;
      if (!m) return false;
      return Array.isArray(m) ? m.includes(filtreMetier) : m === filtreMetier;
    });
    if (filtreVille) list = list.filter(r => r.profiles_artisans?.ville === filtreVille);

    const range = filtrePeriode === "custom"
      ? (dateDebut && dateFin ? { start: dateDebut, end: dateFin } : null)
      : getDateRange(filtrePeriode);
    if (range) list = list.filter(r => r.date >= range.start && r.date <= range.end);

    return list;
  }, [reservations, filtreStatut, filtreArtisan, filtreMetier, filtreVille, filtrePeriode, dateDebut, dateFin]);

  const stats = useMemo(() => ({
    total: filtered.length,
    en_attente: filtered.filter(r => r.statut === "en_attente").length,
    confirme: filtered.filter(r => r.statut === "confirme").length,
    en_cours: filtered.filter(r => r.statut === "en_cours").length,
    termine: filtered.filter(r => r.statut === "termine").length,
    annule: filtered.filter(r => r.statut === "annule").length,
    ca: filtered.filter(r => r.statut === "termine").reduce((s, r) => s + (r.montant_total ?? 0), 0),
  }), [filtered]);

  const selectClass = "bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Réservations</h1>
        <p className="text-sm text-gray-400 mt-1">{stats.total} résultats · 500 dernières chargées</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} className={selectClass}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>)}
        </select>

        <select value={filtreArtisan} onChange={e => setFiltreArtisan(e.target.value)} className={selectClass}>
          <option value="">Tous les artisans</option>
          {artisans.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
        </select>

        <select value={filtreMetier} onChange={e => setFiltreMetier(e.target.value)} className={selectClass}>
          <option value="">Tous les métiers</option>
          {metiers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={filtreVille} onChange={e => setFiltreVille(e.target.value)} className={selectClass}>
          <option value="">Toutes les villes</option>
          {villes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filtrePeriode} onChange={e => setFiltrePeriode(e.target.value)} className={selectClass}>
          {PERIODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {filtrePeriode === "custom" && (
          <>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={selectClass} />
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={selectClass} />
          </>
        )}

        {(filtreStatut || filtreArtisan || filtreMetier || filtreVille || filtrePeriode) && (
          <button onClick={() => { setFiltreStatut(""); setFiltreArtisan(""); setFiltreMetier(""); setFiltreVille(""); setFiltrePeriode(""); setDateDebut(""); setDateFin(""); }}
            className="text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-3 py-2 rounded-lg transition-colors">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "En attente", value: stats.en_attente, color: "text-amber-400" },
          { label: "Confirmées", value: stats.confirme, color: "text-blue-400" },
          { label: "En cours", value: stats.en_cours, color: "text-brand-400" },
          { label: "Terminées", value: stats.termine, color: "text-green-400" },
          { label: "Annulées", value: stats.annule, color: "text-gray-400" },
          { label: "CA réalisé", value: fmtEuro(stats.ca), color: "text-yellow-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Réf.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Artisan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((r) => {
                const ref = r.id.slice(0, 8).toUpperCase();
                const cp = r.profiles_clients;
                const clientNom = r.client_id
                  ? (cp ? `${cp.prenom ?? ""} ${cp.nom ?? ""}`.trim() || "Client" : "Client")
                  : (r.guest_nom || r.guest_email || "Guest");
                const a = r.profiles_artisans;
                const artisanNom = a ? `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() : "N/A";
                const statut = STATUT_CONFIG[r.statut] ?? { label: r.statut, color: "text-gray-400 bg-gray-800 border-gray-700" };
                const service = (r.services as any)?.titre ?? "N/A";
                return (
                  <tr key={r.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ref}</td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{clientNom}</p>
                      {!r.client_id && <span className="text-xs text-gray-600">Guest</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{artisanNom}</p>
                      {a?.metier && <p className="text-xs text-gray-500">{a.metier}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm max-w-[150px] truncate">{service}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{fmtEuro(r.montant_total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${statut.color}`}>
                        {statut.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">Aucune réservation correspondant aux filtres.</div>
        )}
      </div>
    </div>
  );
}
