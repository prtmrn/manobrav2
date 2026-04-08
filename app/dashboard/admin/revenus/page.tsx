import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Revenus | Admin Manobra" };
export const dynamic = "force-dynamic";

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminRevenusPage() {
  const admin = createAdminClient();

  const [abonnementsRes, reservationsRes] = await Promise.all([
    admin.from("abonnements").select("id, artisan_id, plan, statut, montant, created_at, updated_at"),
    admin.from("reservations").select("id, statut, montant_total, date, created_at"),
  ]);

  const abonnements = (abonnementsRes.data ?? []) as any[];
  const reservations = (reservationsRes.data ?? []) as any[];

  // ── Calculs abonnements ──
  const abonnementsActifs = abonnements.filter(a => a.statut === "actif");
  const planEssentiel = abonnementsActifs.filter(a => a.plan === "essentiel");
  const planPro = abonnementsActifs.filter(a => a.plan === "pro");
  const mrr = planEssentiel.length * 29 + planPro.length * 59;
  const arr = mrr * 12;

  // ── Calculs réservations ──
  const reservationsTerminees = reservations.filter(r => r.statut === "termine");
  const caReservations = reservationsTerminees.reduce((s: number, r: any) => s + (r.montant_total ?? 0), 0);

  // ── Revenus par mois (6 derniers mois) ──
  const now = new Date();
  const moisLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
    };
  });

  const revenusMois = moisLabels.map(({ key, label }) => {
    const abos = abonnements.filter(a => a.created_at?.startsWith(key) && a.statut === "actif");
    const mrrMois = abos.filter((a: any) => a.plan === "essentiel").length * 29 +
                    abos.filter((a: any) => a.plan === "pro").length * 59;
    const resas = reservationsTerminees.filter((r: any) => r.date?.startsWith(key));
    const caResas = resas.reduce((s: number, r: any) => s + (r.montant_total ?? 0), 0);
    return { label, mrrMois, caResas, total: mrrMois + caResas };
  });

  // ── Churn ──
  const totalAbonnementsJamais = abonnements.length;
  const abonnementsAnnules = abonnements.filter(a => a.statut === "annule").length;
  const churnRate = totalAbonnementsJamais > 0
    ? ((abonnementsAnnules / totalAbonnementsJamais) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenus</h1>
        <p className="text-sm text-gray-400 mt-1">MRR, abonnements et chiffre d'affaires réservations</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: fmtEuro(mrr), sub: "Revenus mensuels récurrents", color: "text-green-400" },
          { label: "ARR", value: fmtEuro(arr), sub: "Revenus annuels projetés", color: "text-brand-400" },
          { label: "CA réservations", value: fmtEuro(caReservations), sub: "Prestations terminées", color: "text-blue-400" },
          { label: "Churn rate", value: `${churnRate}%`, sub: "Taux d'annulation abonnements", color: churnRate === "0.0" ? "text-green-400" : "text-red-400" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm font-semibold text-white mt-1">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Abonnements actifs */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Abonnements actifs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { plan: "Essentiel", count: planEssentiel.length, prix: 29, color: "text-brand-400", bg: "bg-brand-900/20 border-brand-800" },
            { plan: "Pro", count: planPro.length, prix: 59, color: "text-purple-400", bg: "bg-purple-900/20 border-purple-800" },
          ].map(({ plan, count, prix, color, bg }) => (
            <div key={plan} className={`rounded-2xl border p-5 ${bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-sm font-semibold text-white mt-1">Plan {plan}</p>
                  <p className="text-xs text-gray-400">{prix}€/mois · {fmtEuro(count * prix)}/mois</p>
                </div>
                <div className={`text-4xl font-black opacity-20 ${color}`}>{prix}€</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenus par mois */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Revenus par mois (6 derniers mois)</h2>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mois</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">MRR abonnements</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">CA réservations</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {revenusMois.map(({ label, mrrMois, caResas, total }) => (
                <tr key={label} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium capitalize">{label}</td>
                  <td className="px-4 py-3 text-brand-400 font-semibold">{fmtEuro(mrrMois)}</td>
                  <td className="px-4 py-3 text-blue-400 font-semibold">{fmtEuro(caResas)}</td>
                  <td className="px-4 py-3 text-green-400 font-bold">{fmtEuro(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Derniers abonnements */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Derniers abonnements</h2>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {abonnements.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Aucun abonnement enregistré — Stripe non configuré.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Artisan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Depuis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {abonnements.slice(0, 20).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white">{a.artisan_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{a.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                        a.statut === "actif"
                          ? "text-green-400 bg-green-900/30 border-green-800"
                          : "text-gray-400 bg-gray-800 border-gray-700"
                      }`}>{a.statut}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
