import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Paiements | Manobra",
};

export default function PaiementsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Paiements</h1>
      <p className="text-gray-500 text-sm mb-2">
        La configuration des paiements sera disponible prochainement.
      </p>
      <p className="text-gray-400 text-xs mb-8">
        Manobra intégrera Stripe pour vous permettre de recevoir vos revenus directement sur votre compte bancaire.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour au tableau de bord
      </Link>
    </div>
  );
}
