// types/index.ts
export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  classe: string;
  problematique: string | null;
  categorie: string | null;
  guide_id: string | null;
  mot_de_passe: string | null;
  convocation_mars: string;
  convocation_avril: string;
  presence_9_mars: boolean;
  presence_10_mars: boolean;
  presence_16_avril: boolean;
  presence_17_avril: boolean;
  created_at: string;
  date_defense: string | null;
  heure_defense: string | null;
  localisation_defense: string | null;
  lecteur_interne_id: string | null;
  lecteur_externe_id: string | null;
  mediateur_id: string | null;
  source_1: string | null;
  source_2: string | null;
  source_3: string | null;
  source_4: string | null;
  source_5: string | null;
  thematique: string | null; // Si vous avez ce champ
}

export interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  missingField: string;
}
