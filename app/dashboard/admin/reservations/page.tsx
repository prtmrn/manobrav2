import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Réservations | Admin Manobra" };
export const dynamic = "force-dynamic";

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "text-amber-400 bg-amber-900/30 border-amber-800" },
  confirme:   { label: "Confirmé",   color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  en_cours:   { label: "En cours",   color: "text-brand-400 bg-brand-900/30 border-brand-800" },
  termine:    { label: "Terminé",    color: "text-green-400 bg-green-900/30 border-green-800" },
  annule:     { label: "Annulé",     color: "text-gray-400 bg-gray-800/30 border-gray-700" },
};

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function fmtEuro(n: number | null) {
  if (!n) return "N/A";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);
}

export default async function AdminReservationsPage() {
  const admin = createAdminClient();

  const { data: reservations } = await admin
    .from("reservations")
    .select("id, date, heure_debut, heure_fin, statut, montant_total, created_at, client_id, artisan_id, guest_nom, guest_email, services!service_id(titre), profiles_artisans!artisan_id(nom, prenom, metier)")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: clientProfiles } = await admin
    .from("profiles_clients")
    .select("id, nom, prenom");

  const clientMap = new Map((clientProfiles ?? []).map((c: any) => [c.id, `${c.prenom ?? ""} ${c.nom ?? ""}`.trim()]));

  const list = (reservations ?? []) as any[];

  const stats = {
    total: list.length,
    en_attente: list.filter(r => r.statut === "en_attente").length,
    confirme: list.filter(r => r.statut === "confirme").length,
    en_cours: list.filter(r => r.statut === "en_cours").length,
    termine: list.filter(r => r.statut === "termine").length,
    annule: list.filter(r => r.statut === "annule").length,
    ca: list.filter(r => r.statut === "termine").reduce((sum: number, r: any) => sum + (r.montant_total ?? 0), 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Réservations</h1>
        <p className="text-sm text-gray-400 mt-1">{stats.total} au total · 100 dernières affichées</p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
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
            {list.map((r) => {
              const ref = r.id.slice(0, 8).toUpperCase();
              const clientNom = r.client_id
                ? (clientMap.get(r.client_id) || "Client")
                : (r.guest_nom || r.guest_email || "Guest");
              const artisan = (r.profiles_artisans as any);
              const artisanNom = artisan ? `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() : "N/A";
              const artisanMetier = artisan?.metier ?? null;
              const serviceTitre = (r.services as any)?.titre ?? "N/A";
              const statut = STATUT_CONFIG[r.statut] ?? { label: r.statut, color: "text-gray-400 bg-gray-800 border-gray-700" };
              return (
                <tr key={r.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{ref}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{clientNom}</p>
                    {r.client_id ? null : <span className="text-xs text-gray-600">Guest</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{artisanNom}</p>
                    {artisanMetier && <p className="text-xs text-gray-500">{artisanMetier}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm max-w-[150px] truncate">{serviceTitre}</td>
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
        {list.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">Aucune réservation.</div>
        )}
      </div>
    </div>
  );
}
