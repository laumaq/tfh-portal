import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour TypeScript
export interface Coordinateur {
  id: string;
  nom: string;
  initiale: string;
  mot_de_passe: string;
  created_at: string;
}

export interface Guide {
  id: string;
  nom: string;
  initiale: string;
  mot_de_passe: string | null;
  created_at: string;
}

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
}

// Fonction pour récupérer les élèves avec données manquantes
export async function getElevesWithMissingData(missingField: string) {
  const supabase = createClient();
  
  let query = supabase
    .from('eleves')
    .select('*');
  
  // Filtres selon le champ manquant
  switch(missingField) {
    case 'problematique':
      query = query.or('problematique.is.null,problematique.eq."",problematique.eq."À définir"');
      break;
    case 'thematique':
      query = query.or('categorie.is.null,categorie.eq."",categorie.eq."À définir"');
      break;
    case 'sources':
      // Vous aurez besoin d'une table sources_eleves ou champ dédié
      query = query.or('sources_completes.is.false,sources_completes.is.null');
      break;
    case 'guide':
      query = query.is('guide_id', null);
      break;
    case 'lecteur_interne':
      query = query.is('lecteur_interne_id', null);
      break;
    case 'lecteur_externe':
      query = query.is('lecteur_externe_id', null);
      break;
    default:
      return [];
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

