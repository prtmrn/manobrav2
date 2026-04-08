import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = createAdminClient();

  const [artisansRes, clientsRes, reservationsRes, artisansActifsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artisan"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
    admin.from("reservations").select("id", { count: "exact", head: true }),
    admin.from("profiles_artisans").select("id", { count: "exact", head: true }).eq("actif", true),
  ]);

  const stats = [
    { label: "Artisans total", value: artisansRes.count ?? 0, sub: `${artisansActifsRes.count ?? 0} actifs`, href: "/dashboard/admin/artisans", color: "text-brand-400", bg: "bg-brand-900/30" },
    { label: "Clients", value: clientsRes.count ?? 0, sub: "inscrits", href: "/dashboard/admin/clients", color: "text-blue-400", bg: "bg-blue-900/30" },
    { label: "Réservations", value: reservationsRes.count ?? 0, sub: "total", href: "/dashboard/admin/reservations", color: "text-purple-400", bg: "bg-purple-900/30" },
  ];

  const sections = [
    { href: "/dashboard/admin/artisans", label: "Artisans", desc: "Validation, activation, profils" },
    { href: "/dashboard/admin/clients", label: "Clients", desc: "Comptes, historique, LTV" },
    { href: "/dashboard/admin/reservations", label: "Réservations", desc: "Vue globale, statuts" },
    { href: "/dashboard/admin/revenus", label: "Revenus", desc: "MRR, abonnements, churn" },
    { href: "/dashboard/admin/analyses", label: "Analyses", desc: "Personas, métriques, funnel" },
    { href: "/dashboard/admin/emails", label: "Emails", desc: "Historique, templates Brevo" },
    { href: "/dashboard/admin/alertes", label: "Alertes", desc: "Réservations bloquées, avis négatifs" },
    { href: "/dashboard/admin/litiges", label: "Litiges", desc: "Signalements, suivi résolution" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Vue d'ensemble</h1>
        <p className="text-sm text-gray-400 mt-1">Plateforme Manobra | back-office interne</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, href, color, bg }) => (
          <Link key={label} href={href}
            className={`${bg} rounded-2xl border border-gray-800 p-6 hover:border-gray-600 transition-colors`}>
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-sm text-white font-medium mt-1">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Sections */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sections.map(({ href, label, desc }) => (
            <Link key={href} href={href}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-600 hover:bg-gray-800 transition-colors">
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
