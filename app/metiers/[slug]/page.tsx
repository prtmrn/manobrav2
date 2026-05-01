import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIER_LIST, METIER_CONFIG } from "@/components/map/metier-config";
import { SERVICES_STANDARDISES } from "@/lib/services-standardises";
import NavbarLanding from "@/components/landing/NavbarLanding";
import { slugify } from "@/lib/metier-slug";

function getMetierFromSlug(slug: string): string | null {
  return METIER_LIST.find(m => slugify(m) === slug) ?? null;
}

export async function generateStaticParams() {
  return METIER_LIST.filter(m => m !== "Autre").map(m => ({ slug: slugify(m) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const metier = getMetierFromSlug(slug);
  if (!metier) return {};
  return {
    title: `${metier} à domicile | Manobra`,
    description: `Trouvez un ${metier.toLowerCase()} vérifié près de chez vous. Réservez en ligne, devis transparent, avis certifiés. Intervention rapide avec Manobra.`,
  };
}

export default async function MetierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const metier = getMetierFromSlug(slug);
  if (!metier) notFound();

  const config = METIER_CONFIG[metier];
  const services = SERVICES_STANDARDISES.filter(s => s.metier === metier);
  const searchUrl = `/recherche?metier=${encodeURIComponent(metier)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">
          <Link href="/" className="font-bold text-brand-600 text-lg flex-shrink-0">Manobra</Link>
          <NavbarLanding />
        </div>
      </header>

      <main>
        {/* Hero métier */}
        <section className="bg-white border-b border-gray-100 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <Link href="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
              <span>/</span>
              <Link href="/metiers" className="hover:text-gray-600 transition-colors">Métiers</Link>
              <span>/</span>
              <span className="text-gray-700 font-medium">{metier}</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: config?.color + "20" }}
              >
                <svg className="w-8 h-8" style={{ color: config?.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.653-4.655m5.8-5.8l2.496-3.03c.317-.384.74-.626 1.208-.766m0 0a3 3 0 015.656 2.614l-2.496 3.03m-6.36-5.644a3 3 0 00-5.656 2.614" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{metier} à domicile</h1>
                <p className="text-gray-500 text-base">
                  Trouvez un {metier.toLowerCase()} vérifié près de chez vous. Réservation en ligne, devis transparent, avis certifiés.
                </p>
              </div>
              <Link
                href={searchUrl}
                className="flex-shrink-0 inline-flex items-center gap-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3.5 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-brand-200 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Trouver un {metier.toLowerCase()}
              </Link>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-8">
            {/* Placeholder contenu SEO */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">À propos du métier de {metier.toLowerCase()}</h2>
              <div className="space-y-3 text-gray-500 text-sm leading-relaxed">
                <p className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200 text-gray-400 italic">
                  Contenu SEO à venir — description du métier, quand faire appel à ce professionnel, ce qu&apos;il faut vérifier avant de réserver.
                </p>
              </div>
            </section>

            {/* Services */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Services proposés</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(s => (
                  <Link
                    key={s.id}
                    href={`/recherche?service=${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config?.color }} />
                    <span className="text-sm text-gray-700 group-hover:text-brand-700 transition-colors">{s.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* CTA sticky */}
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sticky top-20">
              <h3 className="font-bold text-gray-900 mb-2">Besoin d&apos;un {metier.toLowerCase()} ?</h3>
              <p className="text-sm text-gray-500 mb-4">Trouvez un professionnel vérifié près de chez vous et réservez en ligne.</p>
              <Link
                href={searchUrl}
                className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
              >
                Demander une prestation
              </Link>
              <div className="mt-4 space-y-2">
                {["Artisans vérifiés", "Devis transparent", "Réservation en ligne", "Avis certifiés"].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Autres métiers */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Autres métiers</h3>
              <div className="space-y-1">
                {METIER_LIST.filter(m => m !== "Autre" && m !== metier).map(m => (
                  <Link
                    key={m}
                    href={`/metiers/${slugify(m)}`}
                    className="block text-sm text-gray-500 hover:text-brand-600 py-1 transition-colors"
                  >
                    {m}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Manobra. Tous droits réservés.
      </footer>
    </div>
  );
}
