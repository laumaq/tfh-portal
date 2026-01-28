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
}

export interface Guide {
  id: string;
  nom: string;
  prenom: string; 
  initiale: string;
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

// ... toutes les autres interfaces ...
