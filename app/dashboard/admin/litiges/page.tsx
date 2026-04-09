import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Litiges | Admin Manobra" };
export const dynamic = "force-dynamic";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function AdminLitigesPage() {
  const admin = createAdminClient();

  const { data: litiges } = await (admin as any)
    .from("litiges")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (litiges ?? []) as any[];

  const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
    ouvert:     { label: "Ouvert",     color: "text-red-400 bg-red-900/30 border-red-800" },
    en_cours:   { label: "En cours",   color: "text-amber-400 bg-amber-900/30 border-amber-800" },
    resolu:     { label: "Résolu",     color: "text-green-400 bg-green-900/30 border-green-800" },
    ferme:      { label: "Fermé",      color: "text-gray-400 bg-gray-800 border-gray-700" },
  };

  const stats = {
    total: list.length,
    ouverts: list.filter(l => l.statut === "ouvert").length,
    en_cours: list.filter(l => l.statut === "en_cours").length,
    resolus: list.filter(l => l.statut === "resolu").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Litiges</h1>
        <p className="text-sm text-gray-400 mt-1">Signalements et suivi de résolution</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Ouverts", value: stats.ouverts, color: stats.ouverts > 0 ? "text-red-400" : "text-green-400" },
          { label: "En cours", value: stats.en_cours, color: stats.en_cours > 0 ? "text-amber-400" : "text-green-400" },
          { label: "Résolus", value: stats.resolus, color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-white mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table ou état vide */}
      {list.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl border border-green-800 p-12 text-center">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-green-400 font-semibold text-lg">Aucun litige en cours</p>
          <p className="text-gray-500 text-sm mt-2">
            Les litiges apparaîtront ici quand des clients ou artisans signaleront un problème.
          </p>
          <div className="mt-6 bg-gray-800 rounded-xl p-4 text-left max-w-md mx-auto">
            <p className="text-xs font-semibold text-gray-300 mb-2">À venir</p>
            <ul className="space-y-1 text-xs text-gray-500">
              <li>• Formulaire de signalement client/artisan</li>
              <li>• Système de tickets avec suivi</li>
              <li>• Historique des communications</li>
              <li>• Résolution avec remboursement Stripe</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Réf.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Motif</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Déclaré par</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {list.map((l: any) => {
                const statut = STATUT_CONFIG[l.statut] ?? { label: l.statut, color: "text-gray-400 bg-gray-800 border-gray-700" };
                return (
                  <tr key={l.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{l.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-white text-sm max-w-[250px] truncate">{l.motif ?? "N/A"}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{l.declare_par ?? "N/A"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(l.created_at)}</td>
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
        </div>
      )}
    </div>
  );
}
