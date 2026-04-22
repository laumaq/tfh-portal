export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  categorie: string;
  guide_id: string;
  convocation_mars: string;
  convocation_avril: string;
  presence_9_mars: boolean | null;
  presence_10_mars: boolean | null;
  presence_16_avril: boolean | null;
  presence_17_avril: boolean | null;
  date_defense: string | null;
  heure_defense: string | null;
  localisation_defense: string | null;
  lecteur_interne_id: string | null;
  lecteur_externe_id: string | null;
  mediateur_id: string | null;
  guide_nom?: string;
  guide_prenom?: string;
  lecteur_interne_nom?: string;
  lecteur_interne_prenom?: string;
  lecteur_externe_nom?: string;
  lecteur_externe_prenom?: string;
  mediateur_nom?: string;
  mediateur_prenom?: string;
  thematique?: string;
  source_1?: string;
  source_2?: string;
  source_3?: string;
  source_4?: string;
  source_5?: string;
  objectif_particulier?: string | null;
  
  // Nouveau système de sessions - STRINGS
  session_1_convoque?: string;
  session_2_convoque?: string;
  session_3_convoque?: string;
  session_4_convoque?: string;
  session_5_convoque?: string;
  session_6_convoque?: string;
  session_7_convoque?: string;
  session_8_convoque?: string;
  session_9_convoque?: string;
  session_10_convoque?: string;
  session_11_convoque?: string;
  session_12_convoque?: string;
  session_13_convoque?: string;
  session_14_convoque?: string;
  session_15_convoque?: string;
  session_16_convoque?: string;
  session_17_convoque?: string;
  session_18_convoque?: string;
  session_19_convoque?: string;
  session_20_convoque?: string;

  // Présences par journée
  journee_1_present?: boolean | null;
  journee_2_present?: boolean | null;
  journee_3_present?: boolean | null;
  journee_4_present?: boolean | null;
  journee_5_present?: boolean | null;
  journee_6_present?: boolean | null;
  journee_7_present?: boolean | null;
  journee_8_present?: boolean | null;
  journee_9_present?: boolean | null;
  journee_10_present?: boolean | null;
  journee_11_present?: boolean | null;
  journee_12_present?: boolean | null;
  journee_13_present?: boolean | null;
  journee_14_present?: boolean | null;
  journee_15_present?: boolean | null;
  journee_16_present?: boolean | null;
  journee_17_present?: boolean | null;
  journee_18_present?: boolean | null;
  journee_19_present?: boolean | null;
  journee_20_present?: boolean | null;

  mot_de_passe?: string | null;
  tfh_non_rendu?: boolean;
}

export interface Guide {
  id: string;
  nom: string;
  prenom: string; 
  initiale: string;
  email?: string;
  mot_de_passe?: string | null;
}

export interface LecteurExterne {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe?: string | null;
}

export interface Mediateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe?: string | null;
}

export interface Coordinateur {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  mot_de_passe?: string | null;
}

export interface DefenseEvent {
  id: string;
  eleveId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  eleveNom: string;
  elevePrenom: string;
  guideNom: string;
  guidePrenom: string;
  lecteurInterneNom: string;
  lecteurInternePrenom: string;
  lecteurExterneNom: string;
  lecteurExternePrenom: string;
  mediateurNom: string;
  mediateurPrenom: string;
  categorie: string;
  role?: 'guide' | 'lecteur_interne';
}

export interface DayDefenses {
  date: string;
  displayDate: string;
  locations: string[];
  defenses: DefenseEvent[];
}

export interface Conflict {
  type: 'guide' | 'lecteur_interne' | 'lecteur_externe' | 'mediateur' | 'local';
  personOrLocation: string;
  conflictingDefenses: DefenseEvent[];
  message: string;
}

export interface StatsData {
  totalEleves: number;
  avecThematique: number;
  avecProblematique: number;
  avecSources: number;
  avecGuide: number;
  avecLecteurInterne: number;
  avecLecteurExterne: number;
  pourcentageThematique: number;
  pourcentageProblematique: number;
  pourcentageSources: number;
  pourcentageGuide: number;
  pourcentageLecteurInterne: number;
  pourcentageLecteurExterne: number;
}

export interface GuideStats {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  elevesGuides: number;
  elevesLecteurInterne: number;
  convocationsMarsRendues: number;
  convocationsAvrilRendues: number;
  pourcentageConvocationsMars: number;
  pourcentageConvocationsAvril: number;
}

export interface JourneeTFH {
  id: number;
  date: string;
  libelle: string;
}

export interface DisplaySettings {
  lecteur_externe_voir_eleves: boolean;
  lecteur_externe_voir_guides: boolean;
  lecteur_externe_voir_lecteurs_internes: boolean;
  lecteur_externe_voir_mediateurs: boolean;
  lecteur_interne_voir_eleves: boolean;
  lecteur_interne_voir_guides: boolean;
  lecteur_interne_voir_lecteurs_externes: boolean;
  lecteur_interne_voir_mediateurs: boolean;
  mediateur_voir_eleves: boolean;
  mediateur_voir_guides: boolean;
  mediateur_voir_lecteurs_internes: boolean;
  mediateur_voir_lecteurs_externes: boolean;
}

export type TabType = 'dashboard' | 'convocations'| 'presences' | 'defenses' | 'calendrier' | 'gestion-utilisateurs' | 'parametres' | 'stats' | 'controle'  | 'liste-tfh';
export type UserType = 'eleves' | 'guides' | 'lecteurs-externes' | 'mediateurs' | 'coordinateurs';
