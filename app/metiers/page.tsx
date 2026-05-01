import Link from "next/link";
import type { Metadata } from "next";
import { METIER_LIST, METIER_CONFIG } from "@/components/map/metier-config";
import { SERVICES_STANDARDISES } from "@/lib/services-standardises";
import NavbarLanding from "@/components/landing/NavbarLanding";

export const metadata: Metadata = {
  title: "Nos métiers | Manobra",
  description: "Découvrez tous les métiers disponibles sur Manobra : serrurier, plombier, électricien, chauffagiste, vitrier, ramoneur, frigoriste, dépanneur. Des professionnels vérifiés près de chez vous.",
};

export function slugify(metier: string): string {
  return metier
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export default function MetiersPage() {
  const metiers = METIER_LIST.filter(m => m !== "Autre");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">
          <Link href="/" className="font-bold text-brand-600 text-lg flex-shrink-0">Manobra</Link>
          <NavbarLanding />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Nos métiers</h1>
          <p className="text-gray-500 text-base max-w-2xl">
            Des professionnels vérifiés pour tous vos besoins à domicile. Sélectionnez un métier pour découvrir les artisans disponibles près de chez vous.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {metiers.map((metier) => {
            const config = METIER_CONFIG[metier];
            const services = SERVICES_STANDARDISES.filter(s => s.metier === metier).slice(0, 5);
            const slug = slugify(metier);

            return (
              <Link
                key={metier}
                href={`/metiers/${slug}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-200 p-6 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: config?.color + "20" }}
                  >
                    <svg className="w-6 h-6" style={{ color: config?.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.653-4.655m5.8-5.8l2.496-3.03c.317-.384.74-.626 1.208-.766m0 0a3 3 0 015.656 2.614l-2.496 3.03m-6.36-5.644a3 3 0 00-5.656 2.614" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{metier}</h2>
                </div>

                <ul className="space-y-1.5 flex-1">
                  {services.map(s => (
                    <li key={s.id} className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: config?.color }} />
                      {s.label}
                    </li>
                  ))}
                  {SERVICES_STANDARDISES.filter(s => s.metier === metier).length > 5 && (
                    <li className="text-xs text-gray-400 pl-3.5">
                      +{SERVICES_STANDARDISES.filter(s => s.metier === metier).length - 5} autres services
                    </li>
                  )}
                </ul>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {SERVICES_STANDARDISES.filter(s => s.metier === metier).length} services disponibles
                  </span>
                  <span className="text-xs font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
                    Voir les artisans →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="mt-16 border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Manobra. Tous droits réservés.
      </footer>
    </div>
  );
}
