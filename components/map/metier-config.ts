export type MetierConfig = {
  color: string;
  label: string;
};

// Colors and emoji per métier — used for map markers
export const METIER_CONFIG: Record<string, MetierConfig> = {
  Serrurier:      { color: "#1E40AF", label: "Serrurier" },
  Plombier:       { color: "#3B82F6", label: "Plombier" },
  Chauffagiste:   { color: "#EF4444", label: "Chauffagiste" },
  Électricien:    { color: "#F59E0B", label: "Électricien" },
  Vitrier:        { color: "#06B6D4", label: "Vitrier" },
  Ramoneur:       { color: "#1C1917", label: "Ramoneur" },
  Frigoriste:     { color: "#0EA5E9", label: "Frigoriste" },
  Dépanneur:      { color: "#F97316", label: "Dépanneur" },
  Autre:          { color: "#6B7280", label: "Autre" },
};

export const METIER_LIST = Object.keys(METIER_CONFIG) as (keyof typeof METIER_CONFIG)[];

/** Returns config for a given métier, falling back to "Autre". */
export function getMetierConfig(metier: string | null | undefined): MetierConfig {
  return METIER_CONFIG[metier ?? ""] ?? METIER_CONFIG["Autre"];
}
