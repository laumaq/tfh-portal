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
}

export interface Guide {
  id: string;
  nom: string;
  prenom: string; 
  initiale: string;
  email?: string;
}

export interface LecteurExterne {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export interface Mediateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export interface Coordinateur {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
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

export type TabType = 'dashboard' | 'convocations' | 'defenses' | 'calendrier' | 'gestion-utilisateurs' | 'parametres' | 'stats' | 'controle';
export type UserType = 'eleves' | 'guides' | 'lecteurs-externes' | 'mediateurs' | 'coordinateurs';
