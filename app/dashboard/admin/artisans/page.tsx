import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import AdminArtisanActions from "@/components/admin/AdminArtisanActions";

export const dynamic = "force-dynamic";

export default async function AdminArtisansPage() {
  const admin = createAdminClient();

  const { data: artisans } = await admin
    .from("profiles_artisans")
    .select("id, nom, prenom, metier, ville, actif, siret, telephone, note_moyenne, nombre_avis, created_at")
    .order("created_at", { ascending: false });

  const { data: emails } = await admin.auth.admin.listUsers();
  const emailMap = new Map(emails.users.map((u) => [u.id, u.email]));

  const list = (artisans ?? []) as Array<{
    id: string; nom: string | null; prenom: string | null;
    metier: string | null; ville: string | null; actif: boolean;
    siret: string | null; telephone: string | null;
    note_moyenne: number; nombre_avis: number; created_at: string;
  }>;

  const total = list.length;
  const actifs = list.filter((a) => a.actif).length;
  const inactifs = total - actifs;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artisans</h1>
          <p className="text-sm text-gray-400 mt-1">
            {total} inscrits · {actifs} actifs · {inactifs} inactifs
          </p>
        </div>
      </div>

      {/* Filtres rapides */}
      <div className="flex gap-2">
        {[
          { label: "Tous", value: "all" },
          { label: "Actifs", value: "actifs" },
          { label: "Inactifs", value: "inactifs" },
        ].map(({ label }) => (
          <span key={label}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
            {label}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Artisan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Métier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ville</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">SIRET</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Avis</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {list.map((a) => {
              const nom = `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Sans nom";
              const email = emailMap.get(a.id) ?? "N/A";
              const date = new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
              return (
                <tr key={a.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{nom}</p>
                      <p className="text-xs text-gray-500">{email}</p>
                      <p className="text-xs text-gray-600">{date}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{a.metier ?? "N/A"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{a.ville ?? "N/A"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono ${a.siret ? "text-green-400" : "text-red-400"}`}>
                      {a.siret ? "✓ " + a.siret.slice(0, 9) + "..." : "✗ Manquant"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.nombre_avis > 0 ? (
                      <span className="text-yellow-400 text-xs">
                        ★ {a.note_moyenne.toFixed(1)} ({a.nombre_avis})
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">Aucun</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                      a.actif
                        ? "bg-green-900/50 text-green-400 border border-green-800"
                        : "bg-red-900/50 text-red-400 border border-red-800"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.actif ? "bg-green-400" : "bg-red-400"}`} />
                      {a.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/prestataires/${a.id}`} target="_blank"
                        className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                        Voir →
                      </Link>
                      <AdminArtisanActions artisanId={a.id} actif={a.actif} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {list.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">Aucun artisan inscrit.</div>
        )}
      </div>
    </div>
  );
}
