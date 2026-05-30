import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import AdminArtisanActions from "@/components/admin/AdminArtisanActions";
export const dynamic = "force-dynamic";

export default async function AdminArtisansPage() {
  const admin = createAdminClient();
  const { data: artisans } = await (admin
    .from("profiles_artisans") as any)
    .select("id, nom, prenom, metier, ville, actif, siret, telephone, note_moyenne, nombre_avis, created_at, verification_status, verification_note, assurance_rc_numero, assurance_rc_assureur, assurance_decennale_numero, assurance_decennale_assureur, qualification_cstb_numero, bypass_verification")
    .order("created_at", { ascending: false });

  const { data: emails } = await admin.auth.admin.listUsers();
  const emailMap = new Map(emails.users.map((u: any) => [u.id, u.email]));

  const list = (artisans ?? []) as Array<{
    id: string; nom: string | null; prenom: string | null;
    metier: string | null; ville: string | null; actif: boolean;
    siret: string | null; telephone: string | null;
    note_moyenne: number; nombre_avis: number; created_at: string;
    verification_status: string | null;
    verification_note: string | null;
    assurance_rc_numero: string | null;
    assurance_rc_assureur: string | null;
    assurance_decennale_numero: string | null;
    assurance_decennale_assureur: string | null;
    qualification_cstb_numero: string | null;
    bypass_verification: boolean;
  }>;

  const total = list.length;
  const actifs = list.filter((a) => a.actif).length;
  const inactifs = total - actifs;
  const enAttente = list.filter((a) => a.verification_status === "en_attente").length;

  function verifBadge(status: string | null) {
    switch (status) {
      case "verifie":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/50 text-emerald-400 border border-emerald-800">✓ Vérifié</span>;
      case "en_attente":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/50 text-yellow-400 border border-yellow-800">⏳ En attente</span>;
      case "rejete":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/50 text-red-400 border border-red-800">✗ Rejeté</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-500 border border-gray-700">Non soumis</span>;
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artisans</h1>
          <p className="text-sm text-gray-400 mt-1">
            {total} inscrits · {actifs} actifs · {inactifs} inactifs
            {enAttente > 0 && <span className="text-yellow-400"> · {enAttente} en attente de vérification</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["Tous", "Actifs", "Inactifs", enAttente > 0 ? `En attente (${enAttente})` : "En attente"].map((label) => (
          <span key={label} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
            {label}
          </span>
        ))}
      </div>

      {enAttente > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-yellow-400 text-lg">⚠️</span>
          <p className="text-yellow-300 text-sm">
            <span className="font-semibold">{enAttente} profil{enAttente > 1 ? "s" : ""}</span> en attente de vérification des documents.
          </p>
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-44">Artisan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Métier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Ville</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">SIRET</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Avis</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Vérification</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {list.map((a) => {
              const nom = `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Sans nom";
              const email = emailMap.get(a.id) ?? "N/A";
              const date = new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
              const metier = Array.isArray(a.metier) ? (a.metier as string[]).join(" · ") : (a.metier ?? "N/A");
              return (
                <tr key={a.id} className={`hover:bg-gray-800/50 transition-colors ${a.verification_status === "en_attente" ? "bg-yellow-900/5" : ""}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{nom}</p>
                      <p className="text-xs text-gray-500">{email}</p>
                      <p className="text-xs text-gray-600">{date}</p>
                      {a.bypass_verification && <span className="text-xs text-purple-400 font-mono">bypass</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-gray-300 text-xs block truncate max-w-[130px]">{metier}</span></td>
                  <td className="px-4 py-3"><span className="text-gray-300">{a.ville ?? "N/A"}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono ${a.siret ? "text-green-400" : "text-red-400"}`}>
                      {a.siret ? "✓ " + a.siret.slice(0, 9) + "..." : "✗ Manquant"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.nombre_avis > 0 ? (
                      <span className="text-yellow-400 text-xs">★ {a.note_moyenne.toFixed(1)} ({a.nombre_avis})</span>
                    ) : (
                      <span className="text-gray-600 text-xs">Aucun</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                      a.actif ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-red-900/50 text-red-400 border border-red-800"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.actif ? "bg-green-400" : "bg-red-400"}`} />
                      {a.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{verifBadge(a.verification_status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/prestataires/${a.id}`} target="_blank" className="text-xs text-brand-400 hover:text-brand-300 font-medium whitespace-nowrap">
                        Voir →
                      </Link>
                      <AdminArtisanActions
                        artisanId={a.id}
                        actif={a.actif}
                        verificationStatus={a.verification_status ?? "non_soumis"}
                        verificationNote={a.verification_note ?? ""}
                        assuranceRcNumero={a.assurance_rc_numero ?? ""}
                        assuranceRcAssureur={a.assurance_rc_assureur ?? ""}
                        assuranceDecennaleNumero={a.assurance_decennale_numero ?? ""}
                        assuranceDecennaleAssureur={a.assurance_decennale_assureur ?? ""}
                        qualificationCstbNumero={a.qualification_cstb_numero ?? ""}
                      />
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
