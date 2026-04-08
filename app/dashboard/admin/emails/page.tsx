"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  { value: "", label: "Toutes catégories" },
  { value: "confirmation_client", label: "Confirmation client" },
  { value: "notification_artisan", label: "Notification artisan" },
  { value: "rappel_client", label: "Rappel client" },
  { value: "rappel_artisan", label: "Rappel artisan" },
  { value: "avis", label: "Demande d'avis" },
  { value: "abonnement", label: "Abonnement" },
  { value: "autre", label: "Autre" },
];

const STATUTS = [
  { value: "", label: "Tous statuts" },
  { value: "envoye", label: "Envoyé" },
  { value: "erreur", label: "Erreur" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const CATEGORIE_CONFIG: Record<string, { label: string; color: string }> = {
  confirmation_client:  { label: "Confirmation client",   color: "text-brand-400 bg-brand-900/30 border-brand-800" },
  notification_artisan: { label: "Notification artisan",  color: "text-purple-400 bg-purple-900/30 border-purple-800" },
  rappel_client:        { label: "Rappel client",         color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  rappel_artisan:       { label: "Rappel artisan",        color: "text-indigo-400 bg-indigo-900/30 border-indigo-800" },
  avis:                 { label: "Demande d'avis",        color: "text-yellow-400 bg-yellow-900/30 border-yellow-800" },
  abonnement:           { label: "Abonnement",            color: "text-green-400 bg-green-900/30 border-green-800" },
  autre:                { label: "Autre",                 color: "text-gray-400 bg-gray-800 border-gray-700" },
};

const PAGE_SIZE = 50;

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreSearch, setFiltreSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      let query = (supabase as any)
        .from("email_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filtreCategorie) query = query.eq("categorie", filtreCategorie);
      if (filtreStatut) query = query.eq("statut", filtreStatut);
      if (filtreSearch) query = query.ilike("destinataire", `%${filtreSearch}%`);

      const { data, count } = await query;
      setEmails(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };
    load();
  }, [page, filtreCategorie, filtreStatut, filtreSearch]);

  const stats = useMemo(() => ({
    total,
    parCategorie: emails.reduce((acc: any, e: any) => {
      acc[e.categorie] = (acc[e.categorie] ?? 0) + 1;
      return acc;
    }, {}),
  }), [emails, total]);

  const selectClass = "bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500";
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Emails</h1>
        <p className="text-sm text-gray-400 mt-1">{total} emails enregistrés · {PAGE_SIZE} par page</p>
      </div>

      {/* Stats par catégorie */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(CATEGORIE_CONFIG).slice(0, 4).map(([cat, cfg]) => (
          <button key={cat} onClick={() => { setFiltreCategorie(cat); setPage(0); }}
            className={`bg-gray-900 rounded-xl border p-3 text-left hover:border-gray-600 transition-colors ${
              filtreCategorie === cat ? "border-brand-600" : "border-gray-800"
            }`}>
            <p className="text-lg font-bold text-white">{stats.parCategorie[cat] ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher par email..."
          value={filtreSearch}
          onChange={e => { setFiltreSearch(e.target.value); setPage(0); }}
          className={selectClass + " flex-1 min-w-[200px]"}
        />
        <select value={filtreCategorie} onChange={e => { setFiltreCategorie(e.target.value); setPage(0); }} className={selectClass}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(0); }} className={selectClass}>
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(filtreCategorie || filtreStatut || filtreSearch) && (
          <button onClick={() => { setFiltreCategorie(""); setFiltreStatut(""); setFiltreSearch(""); setPage(0); }}
            className="text-xs text-red-400 hover:text-red-300 border border-red-800 px-3 py-2 rounded-lg">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Chargement...</div>
        ) : emails.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Aucun email enregistré. Les logs apparaîtront après les prochains envois.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Destinataire</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sujet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Catégorie</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {emails.map((e: any) => {
                const cat = CATEGORIE_CONFIG[e.categorie] ?? { label: e.categorie, color: "text-gray-400 bg-gray-800 border-gray-700" };
                return (
                  <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-300 text-sm">{e.destinataire}</td>
                    <td className="px-4 py-3 text-white text-sm max-w-[250px] truncate">{e.sujet}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(e.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${e.statut === "envoye" ? "text-green-400" : "text-red-400"}`}>
                        {e.statut === "envoye" ? "✓ Envoyé" : "✗ Erreur"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Page {page + 1} sur {totalPages} · {total} emails
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-300 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
              ← Précédent
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-300 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
