import Link from "next/link";
import { METIER_CONFIG, METIER_LIST } from "@/components/map/metier-config";

const TOP_SERVICES: Record<string, string[]> = {
  "Serrurier": ["Ouverture de porte", "Changement de serrure", "Blindage de porte"],
  "Plombier": ["Débouchage", "Fuite robinet", "Chauffe-eau"],
  "Chauffagiste": ["Entretien chaudière", "Pompe à chaleur", "Dépannage chauffage"],
  "Électricien": ["Tableau électrique", "Installation prise", "Dépannage panne"],
  "Vitrier": ["Vitre cassée", "Double vitrage", "Porte-fenêtre"],
};

function MetierIcon({ metier, color }: { metier: string; color: string }) {
  const paths: Record<string, string> = {
    "Serrurier": "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    "Plombier": "M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02l.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z",
    "Électricien": "M13 10V3L4 14h7v7l9-11h-7z",
    "Vitrier": "M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10",
  };

  if (metier === "Chauffagiste") {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    );
  }

  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[metier] ?? ""} />
    </svg>
  );
}

function MetierCard({ metier }: { metier: string }) {
  const config = METIER_CONFIG[metier];
  const color = config?.color ?? "#6B7280";
  const slug = metier.toLowerCase()
    .replace(/[éèê]/g, "e")
    .replace(/[àâ]/g, "a")
    .replace(/\s+/g, "-");

  return (
    <Link
      href={`/metiers/${slug}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:scale-[1.02] hover:shadow-md hover:border-brand-200 transition-all duration-200 p-5 flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + "20" }}
        >
          <MetierIcon metier={metier} color={color} />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">{metier}</h3>
      </div>
      <ul className="space-y-1">
        {(TOP_SERVICES[metier] ?? []).map(svc => (
          <li key={svc} className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-brand-300 flex-shrink-0" />
            {svc}
          </li>
        ))}
      </ul>
      <span className="text-xs font-semibold text-brand-600 group-hover:text-brand-700 transition-colors mt-auto">
        Voir les artisans →
      </span>
    </Link>
  );
}

export default function MetiersGrid() {
  const metiers = METIER_LIST.filter(m => m !== "Autre");
  const first3 = metiers.slice(0, 3);
  const last2 = metiers.slice(3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {first3.map(m => <MetierCard key={m} metier={m} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:w-2/3 mx-auto">
        {last2.map(m => <MetierCard key={m} metier={m} />)}
      </div>
    </div>
  );
}
