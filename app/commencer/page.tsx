"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { METIER_LIST } from "@/components/map/metier-config";

export default function CommencerPage() {
  const [choix, setChoix] = useState<"client" | "artisan" | null>(null);
  const [metier, setMetier] = useState("");
  const router = useRouter();

  function handleClient() {
    if (!metier) return;
    router.push(`/recherche?metier=${encodeURIComponent(metier)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <Link href="/" className="font-bold text-gray-900 text-xl tracking-tight">
          Man<span className="text-brand-600">obra</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">

          {/* Étape 1 — Choix */}
          {!choix && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur Manobra</h1>
                <p className="text-gray-500 mt-2">Comment pouvons-nous vous aider ?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setChoix("client")}
                  className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:shadow-md transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                    <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 text-lg">Je cherche un professionnel</p>
                    <p className="text-sm text-gray-500 mt-1">Trouvez un artisan qualifié près de chez vous</p>
                  </div>
                </button>

                <button
                  onClick={() => setChoix("artisan")}
                  className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:shadow-md transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                    <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 text-lg">Je suis artisan</p>
                    <p className="text-sm text-gray-500 mt-1">Développez votre activité avec Manobra</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Étape 2A — Client : choix du métier */}
          {choix === "client" && (
            <div className="space-y-6">
              <button onClick={() => setChoix(null)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">De quel professionnel avez-vous besoin ?</h2>
                <p className="text-gray-500 mt-2">Choisissez un métier pour voir les artisans disponibles</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <select
                  value={metier}
                  onChange={e => setMetier(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
                >
                  <option value="">Sélectionner un métier...</option>
                  {METIER_LIST.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button
                  onClick={handleClient}
                  disabled={!metier}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Voir les artisans disponibles →
                </button>
              </div>
              <p className="text-center text-sm text-gray-400">
                Déjà un compte ?{" "}
                <Link href="/auth/login" className="text-brand-600 hover:text-brand-700 font-medium">
                  Se connecter
                </Link>
              </p>
            </div>
          )}

          {/* Étape 2B — Artisan */}
          {choix === "artisan" && (
            <div className="space-y-6">
              <button onClick={() => setChoix(null)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Rejoignez Manobra</h2>
                <p className="text-gray-500 mt-2">Développez votre activité et trouvez de nouveaux clients</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div className="space-y-3">
                  {[
                    { icon: "✓", text: "Profil professionnel visible par des milliers de clients" },
                    { icon: "✓", text: "Gestion de vos interventions simplifiée" },
                    { icon: "✓", text: "Paiement sécurisé garanti" },
                    { icon: "✓", text: "Support dédié 7j/7" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-xs flex items-center justify-center font-bold flex-shrink-0">{icon}</span>
                      <span className="text-sm text-gray-600">{text}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <Link
                    href="/auth/register?role=artisan"
                    className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Créer mon compte artisan
                  </Link>
                  <Link
                    href="/auth/login"
                    className="block w-full text-center border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3 rounded-xl transition-colors text-sm"
                  >
                    Accéder à mon espace artisan
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
