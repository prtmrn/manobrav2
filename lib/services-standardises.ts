export type ServiceStandardise = {
  id: string;
  label: string;
  metier: string;
};

export const SERVICES_STANDARDISES: ServiceStandardise[] = [
  // Serrurier
  { id: "ser-diag", label: "Diagnostic serrure", metier: "Serrurier" },
  { id: "ser-01", label: "Ouverture de porte claquée", metier: "Serrurier" },
  { id: "ser-02", label: "Ouverture de porte blindée", metier: "Serrurier" },
  { id: "ser-03", label: "Changement de serrure", metier: "Serrurier" },
  { id: "ser-04", label: "Installation serrure multipoints", metier: "Serrurier" },
  { id: "ser-05", label: "Blindage de porte", metier: "Serrurier" },
  { id: "ser-06", label: "Reproduction de clé", metier: "Serrurier" },
  { id: "ser-07", label: "Remplacement de cylindre", metier: "Serrurier" },
  { id: "ser-08", label: "Dépannage serrure cassée", metier: "Serrurier" },

  // Plombier
  { id: "plo-diag-fuite", label: "Diagnostic fuite", metier: "Plombier" },
  { id: "plo-diag-cana", label: "Diagnostic canalisation", metier: "Plombier" },
  { id: "plo-diag-chauf", label: "Diagnostic chauffe-eau", metier: "Plombier" },
  { id: "plo-01", label: "Débouchage d\'évier", metier: "Plombier" },
  { id: "plo-02", label: "Débouchage de toilettes", metier: "Plombier" },
  { id: "plo-03", label: "Débouchage de canalisation", metier: "Plombier" },
  { id: "plo-04", label: "Réparation fuite robinet", metier: "Plombier" },
  { id: "plo-05", label: "Réparation fuite sous évier", metier: "Plombier" },
  { id: "plo-06", label: "Remplacement robinet", metier: "Plombier" },
  { id: "plo-07", label: "Installation chauffe-eau", metier: "Plombier" },
  { id: "plo-08", label: "Remplacement chauffe-eau", metier: "Plombier" },
  { id: "plo-09", label: "Installation baignoire", metier: "Plombier" },
  { id: "plo-10", label: "Installation douche", metier: "Plombier" },
  { id: "plo-11", label: "Réparation chasse d\'eau", metier: "Plombier" },
  { id: "plo-12", label: "Détection fuite", metier: "Plombier" },

  // Chauffagiste
  { id: "cha-diag-chaud", label: "Diagnostic chaudière", metier: "Chauffagiste" },
  { id: "cha-diag-pac", label: "Diagnostic pompe à chaleur", metier: "Chauffagiste" },
  { id: "cha-diag-chauf", label: "Diagnostic chauffage central", metier: "Chauffagiste" },
  { id: "cha-01", label: "Entretien chaudière", metier: "Chauffagiste" },
  { id: "cha-02", label: "Dépannage chaudière", metier: "Chauffagiste" },
  { id: "cha-03", label: "Remplacement chaudière", metier: "Chauffagiste" },
  { id: "cha-04", label: "Installation chaudière gaz", metier: "Chauffagiste" },
  { id: "cha-05", label: "Installation chaudière fioul", metier: "Chauffagiste" },
  { id: "cha-06", label: "Installation pompe à chaleur", metier: "Chauffagiste" },
  { id: "cha-07", label: "Entretien pompe à chaleur", metier: "Chauffagiste" },
  { id: "cha-08", label: "Installation radiateur", metier: "Chauffagiste" },
  { id: "cha-09", label: "Dépannage chauffage central", metier: "Chauffagiste" },
  { id: "cha-10", label: "Rééquilibrage radiateurs", metier: "Chauffagiste" },

  // Électricien
  { id: "ele-diag", label: "Diagnostic électrique", metier: "Électricien" },
  { id: "ele-diag-panne", label: "Diagnostic panne électrique", metier: "Électricien" },
  { id: "ele-diag-tab", label: "Diagnostic tableau électrique", metier: "Électricien" },
  { id: "ele-01", label: "Mise aux normes électriques", metier: "Électricien" },
  { id: "ele-02", label: "Installation tableau électrique", metier: "Électricien" },
  { id: "ele-03", label: "Remplacement tableau électrique", metier: "Électricien" },
  { id: "ele-04", label: "Installation prise électrique", metier: "Électricien" },
  { id: "ele-05", label: "Installation interrupteur", metier: "Électricien" },
  { id: "ele-06", label: "Installation éclairage", metier: "Électricien" },
  { id: "ele-07", label: "Dépannage panne électrique", metier: "Électricien" },
  { id: "ele-08", label: "Installation VMC", metier: "Électricien" },
  { id: "ele-09", label: "Installation borne de recharge", metier: "Électricien" },
  { id: "ele-10", label: "Pose de détecteur de fumée", metier: "Électricien" },
  { id: "ele-11", label: "Installation volet roulant électrique", metier: "Électricien" },

  // Vitrier
  { id: "vit-diag", label: "Diagnostic fenêtre", metier: "Vitrier" },
  { id: "vit-01", label: "Remplacement vitre cassée", metier: "Vitrier" },
  { id: "vit-02", label: "Remplacement double vitrage", metier: "Vitrier" },
  { id: "vit-03", label: "Remplacement fenêtre", metier: "Vitrier" },
  { id: "vit-04", label: "Remplacement porte-fenêtre", metier: "Vitrier" },
  { id: "vit-05", label: "Remplacement miroir", metier: "Vitrier" },
  { id: "vit-06", label: "Pose de film solaire", metier: "Vitrier" },
  { id: "vit-07", label: "Réparation velux", metier: "Vitrier" },

  // Ramoneur
  { id: "ram-diag", label: "Diagnostic conduit de fumée", metier: "Ramoneur" },
  { id: "ram-01", label: "Ramonage cheminée", metier: "Ramoneur" },
  { id: "ram-02", label: "Ramonage poêle à bois", metier: "Ramoneur" },
  { id: "ram-03", label: "Ramonage poêle à granulés", metier: "Ramoneur" },
  { id: "ram-04", label: "Ramonage insert", metier: "Ramoneur" },
  { id: "ram-05", label: "Entretien conduit de fumée", metier: "Ramoneur" },
  { id: "ram-06", label: "Désobstruction conduit", metier: "Ramoneur" },

  // Frigoriste
  { id: "fri-diag", label: "Diagnostic climatisation", metier: "Frigoriste" },
  { id: "fri-diag-gaz", label: "Diagnostic fuite de gaz frigorigène", metier: "Frigoriste" },
  { id: "fri-01", label: "Installation climatisation", metier: "Frigoriste" },
  { id: "fri-02", label: "Entretien climatisation", metier: "Frigoriste" },
  { id: "fri-03", label: "Dépannage climatisation", metier: "Frigoriste" },
  { id: "fri-04", label: "Installation climatisation réversible", metier: "Frigoriste" },
  { id: "fri-05", label: "Remplacement climatisation", metier: "Frigoriste" },
  { id: "fri-06", label: "Recharge gaz climatisation", metier: "Frigoriste" },

  // Dépanneur
  { id: "dep-diag", label: "Diagnostic véhicule", metier: "Dépanneur" },
  { id: "dep-01", label: "Dépannage véhicule en panne", metier: "Dépanneur" },
  { id: "dep-02", label: "Remorquage véhicule", metier: "Dépanneur" },
  { id: "dep-03", label: "Démarrage batterie", metier: "Dépanneur" },
  { id: "dep-04", label: "Changement roue crevée", metier: "Dépanneur" },
  { id: "dep-05", label: "Ouverture véhicule", metier: "Dépanneur" },
  { id: "dep-06", label: "Dépannage panne d\'essence", metier: "Dépanneur" },
];

export function getServicesForMetier(metier: string): ServiceStandardise[] {
  return SERVICES_STANDARDISES.filter((s) => s.metier === metier);
}

export function getServicesForMetiers(metiers: string[]): ServiceStandardise[] {
  return SERVICES_STANDARDISES.filter((s) => metiers.includes(s.metier));
}

export function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function serviceTitleMatchesStandard(titre: string, standard: string): boolean {
  return normalizeStr(titre).includes(normalizeStr(standard));
}
