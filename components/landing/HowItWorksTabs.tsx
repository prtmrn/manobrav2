"use client";

import { useState } from "react";
import Link from "next/link";

type Step = {
  num: string;
  icon: string;
  title: string;
  desc: string;
};

const stepsClient: Step[] = [
  {
    num: "01",
    icon: "🔍",
    title: "Cherchez un artisan",
    desc: "Filtrez par métier, ville et disponibilité. Consultez les profils vérifiés, les notes et les avis clients.",
  },
  {
    num: "02",
    icon: "📅",
    title: "Réservez en ligne",
    desc: "Choisissez un créneau disponible directement dans l'agenda du artisan. Aucun appel téléphonique requis.",
  },
  {
    num: "03",
    icon: "✅",
    title: "Profitez du service",
    desc: "Payez en toute sécurité via Stripe. Laissez un avis après la prestation pour aider la communauté.",
  },
];

const stepsartisan: Step[] = [
  {
    num: "01",
    icon: "📝",
    title: "Créez votre profil",
    desc: "Renseignez votre métier, vos services, vos tarifs et vos disponibilités en quelques minutes.",
  },
  {
    num: "02",
    icon: "📲",
    title: "Recevez des demandes",
    desc: "Les clients réservent directement dans votre agenda. Vous êtes notifié par email à chaque nouvelle demande.",
  },
  {
    num: "03",
    icon: "💶",
    title: "Encaissez facilement",
    desc: "Les paiements sécurisés sont virés directement sur votre compte bancaire via Stripe Connect.",
  },
];

export default function HowItWorksTabs() {
  const [active, setActive] = useState<"client" | "artisan">("client");
  const steps = active === "client" ? stepsClient : stepsartisan;

  return (
    <div>
      {/* Switcher */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-gray-100 rounded-2xl p-1 gap-1">
          {(["client", "artisan"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={[
                "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                active === tab
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {tab === "client" ? "👤 Je cherche un artisan" : "🔨 Je suis artisan"}
            </button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        <div
          className="absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-brand-100 via-brand-300 to-brand-100 hidden md:block"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-white border-2 border-brand-100 shadow-sm flex flex-col items-center justify-center mb-5 transition-colors">
                <span className="text-2xl leading-none mb-1">{step.icon}</span>
                <span className="text-[10px] font-bold text-brand-500 tracking-widest">
                  {step.num}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA inline */}
      <div className="flex justify-center mt-10">
        {active === "client" ? (
          <Link
            href="/recherche"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-sm"
          >
            Trouver un artisan
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        ) : (
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-sm"
          >
            Créer mon profil gratuitement
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
