// Barre de confiance qui circule en continu (marquee).
// Pause au survol de la souris, fixe si l'utilisateur préfère réduire les animations.
import type { ReactNode } from "react";

const ITEMS: { label: string; icon: ReactNode }[] = [
  {
    label: "SIRET vérifié — identité contrôlée",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    ),
  },
  {
    label: "Avis certifiés — après intervention réelle",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    ),
  },
  {
    label: "0 % de commission — l'artisan garde 100 %",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    label: "Sans engagement",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    label: "Devis avant intervention",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12" />
    ),
  },
];

function Piste() {
  return (
    <>
      {ITEMS.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 mr-14 whitespace-nowrap"
        >
          <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            {item.icon}
          </svg>
          {item.label}
        </span>
      ))}
    </>
  );
}

export default function MarqueeConfiance() {
  return (
    <section className="border-y border-gray-100 py-4 overflow-hidden" aria-label="Nos engagements">
      <style>{`
        @keyframes manobra-defile {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .manobra-piste {
          display: inline-flex;
          animation: manobra-defile 32s linear infinite;
        }
        .manobra-marquee:hover .manobra-piste { animation-play-state: paused; }
        .manobra-marquee {
          overflow: hidden;
          white-space: nowrap;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .manobra-piste { animation: none; }
        }
      `}</style>
      <div className="manobra-marquee">
        <div className="manobra-piste">
          {/* Contenu dupliqué pour une boucle parfaitement fluide */}
          <Piste />
          <Piste />
        </div>
      </div>
    </section>
  );
}
