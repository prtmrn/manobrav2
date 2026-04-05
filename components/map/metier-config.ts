export type MetierConfig = {
  color: string;
  emoji: string;
  label: string;
};

// Colors and emoji per métier — used for map markers
export const METIER_CONFIG: Record<string, MetierConfig> = {
  Plombier:       { color: "#3B82F6", emoji: "🔧", label: "Plombier" },
  Électricien:    { color: "#F59E0B", emoji: "⚡", label: "Électricien" },
  Menuisier:      { color: "#92400E", emoji: "🪚", label: "Menuisier" },
  Peintre:        { color: "#8B5CF6", emoji: "🎨", label: "Peintre" },
  Ménage:         { color: "#14B8A6", emoji: "🧹", label: "Ménage" },
  Jardinage:      { color: "#22C55E", emoji: "🌿", label: "Jardinage" },
  Déménagement:   { color: "#F97316", emoji: "📦", label: "Déménagement" },
  Autre:          { color: "#6B7280", emoji: "⚒️", label: "Autre" },
};

export const METIER_LIST = Object.keys(METIER_CONFIG) as (keyof typeof METIER_CONFIG)[];

/** Returns config for a given métier, falling back to "Autre". */
export function getMetierConfig(metier: string | null | undefined): MetierConfig {
  return METIER_CONFIG[metier ?? ""] ?? METIER_CONFIG["Autre"];
}
