import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Alertes | Admin Manobra" };
export const dynamic = "force-dynamic";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminAlertesPage() {
  const admin = createAdminClient();
  const now = new Date();
  const il_y_a_24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const il_y_a_48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const il_y_a_30j = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const aujourd_hui = now.toISOString().split("T")[0];

  const [
    reservAttente48h,
    artisansActifsSansReserv,
    avisNegatifs,
    reservTerminesSansAvis,
    artisansProfil,
  ] = await Promise.all([
    // Réservations en attente depuis plus de 24h
    admin.from("reservations")
      .select("id, created_at, artisan_id, guest_nom, guest_email, client_id")
      .eq("statut", "en_attente")
      .lt("created_at", il_y_a_24h)
      .order("created_at", { ascending: true }),

    // Artisans actifs sans réservation depuis 30j
    admin.from("profiles_artisans")
      .select("id, nom, prenom, metier, ville")
      .eq("actif", true),

    // Avis négatifs récents (note <= 2)
    admin.from("avis")
      .select("id, note, commentaire, created_at, artisan_id")
      .lte("note", 2)
      .gte("created_at", il_y_a_30j)
      .order("created_at", { ascending: false }),

    // Réservations terminées depuis +7j sans avis
    admin.from("reservations")
      .select("id, date, artisan_id, client_id")
      .eq("statut", "termine")
      .lt("date", aujourd_hui)
      .gte("date", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),

    // Profils artisans pour les réservations récentes
    admin.from("reservations")
      .select("artisan_id, created_at")
      .gte("created_at", il_y_a_30j),
  ]);

  const artisansAvecReservRecente = new Set(
    ((artisansProfil.data ?? []) as any[]).map((r: any) => r.artisan_id)
  );

  const artisansSansReserv = ((artisansActifsSansReserv.data ?? []) as any[])
    .filter((a: any) => !artisansAvecReservRecente.has(a.id));

  const reservEnAttente = (reservAttente48h.data ?? []) as any[];
  const avisNeg = (avisNegatifs.data ?? []) as any[];
  const reservSansAvis = (reservTerminesSansAvis.data ?? []) as any[];

  const totalAlertes = reservEnAttente.length + artisansSansReserv.length + avisNeg.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Alertes</h1>
        <p className="text-sm text-gray-400 mt-1">
          {totalAlertes === 0 ? "Aucune alerte active ✓" : `${totalAlertes} alertes nécessitent votre attention`}
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Réserv. en attente +24h", value: reservEnAttente.length, color: reservEnAttente.length > 0 ? "text-red-400" : "text-green-400", bg: reservEnAttente.length > 0 ? "border-red-800" : "border-gray-800" },
          { label: "Artisans sans réserv. 30j", value: artisansSansReserv.length, color: artisansSansReserv.length > 0 ? "text-amber-400" : "text-green-400", bg: artisansSansReserv.length > 0 ? "border-amber-800" : "border-gray-800" },
          { label: "Avis négatifs récents", value: avisNeg.length, color: avisNeg.length > 0 ? "text-red-400" : "text-green-400", bg: avisNeg.length > 0 ? "border-red-800" : "border-gray-800" },
          { label: "Réserv. terminées sans avis", value: reservSansAvis.length, color: "text-gray-400", bg: "border-gray-800" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`bg-gray-900 rounded-2xl border p-4 ${bg}`}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Réservations en attente depuis +24h */}
      {reservEnAttente.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
            Réservations en attente depuis plus de 24h ({reservEnAttente.length})
          </h2>
          <div className="bg-gray-900 rounded-2xl border border-red-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Réf.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Créée le</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {reservEnAttente.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-white text-sm">{r.guest_nom || r.guest_email || "Client connecté"}</td>
                    <td className="px-4 py-3 text-red-400 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/admin/reservations`}
                        className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Artisans actifs sans réservation depuis 30j */}
      {artisansSansReserv.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Artisans actifs sans réservation depuis 30j ({artisansSansReserv.length})
          </h2>
          <div className="bg-gray-900 rounded-2xl border border-amber-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Artisan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Métier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Ville</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {artisansSansReserv.slice(0, 10).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white text-sm">{`${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{a.metier ?? "N/A"}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{a.ville ?? "N/A"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/prestataires/${a.id}`} target="_blank"
                        className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                        Voir profil →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Avis négatifs */}
      {avisNeg.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Avis négatifs récents ({avisNeg.length})
          </h2>
          <div className="bg-gray-900 rounded-2xl border border-red-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Note</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Commentaire</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {avisNeg.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <span className="text-red-400 font-bold">{"★".repeat(a.note)}{"☆".repeat(5 - a.note)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm max-w-[300px] truncate">{a.commentaire ?? "N/A"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tout va bien */}
      {totalAlertes === 0 && (
        <div className="bg-gray-900 rounded-2xl border border-green-800 p-8 text-center">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-green-400 font-semibold">Tout est en ordre</p>
          <p className="text-gray-500 text-sm mt-1">Aucune alerte active sur la plateforme</p>
        </div>
      )}
    </div>
  );
}
