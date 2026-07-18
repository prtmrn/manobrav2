import Link from "next/link";
import Image from "next/image";
import { slugify } from "@/lib/metier-slug";
import type { Metadata } from "next";
import { METIER_LIST, METIER_CONFIG } from "@/components/map/metier-config";
import { SERVICES_STANDARDISES } from "@/lib/services-standardises";
import NavbarLanding from "@/components/landing/NavbarLanding";

export const metadata: Metadata = {
  title: "Nos métiers | Manobra",
  description: "Découvrez tous les métiers disponibles sur Manobra : serrurier, plombier, électricien, chauffagiste, vitrier, ramoneur, frigoriste, dépanneur. Des professionnels vérifiés près de chez vous.",
};



export default function MetiersPage() {
  const metiers = METIER_LIST.filter(m => m !== "Autre");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">
          <Link href="/" className="flex items-center flex-shrink-0"><Image src="/manobra-logo.png" alt="Manobra" width={315} height={128} className="h-9 w-auto" priority /></Link>
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

        {(() => {
          const ICONS: Record<string, React.ReactNode> = {
            "Serrurier": <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
            "Plombier": <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02l.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>,
            "Chauffagiste": <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
            "Électricien": <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
            "Vitrier": <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" /></svg>,
          };
          const renderCard = (metier: string) => {
            const config = METIER_CONFIG[metier];
            const services = SERVICES_STANDARDISES.filter(s => s.metier === metier).slice(0, 5);
            const slug = slugify(metier);

            return (
              <Link
                key={metier}
                href={`/metiers/${slug}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:scale-[1.02] hover:shadow-md hover:border-brand-200 transition-all duration-200 p-6 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: config?.color + "20" }}
                  >
                    {ICONS[metier]}
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
          };
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {metiers.slice(0,3).map(renderCard)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:w-2/3 mx-auto">
                {metiers.slice(3).map(renderCard)}
              </div>
            </div>
          );
        })()}
      </main>

      <footer className="mt-16 border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Manobra. Tous droits réservés.
      </footer>
    </div>
  );
}
