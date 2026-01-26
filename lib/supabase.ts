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
    case 'sources':
      // Adapter selon votre schéma de base de données
      // Exemple avec des champs source_1 à source_5
      query = query.or(
        'source_1.is.null,source_1.eq."",' +
        'source_2.is.null,source_2.eq."",' +
        'source_3.is.null,source_3.eq."",' +
        'source_4.is.null,source_4.eq."",' +
        'source_5.is.null,source_5.eq.""'
      );
      break;
    default:
      return [];
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getStats() {
  const supabase = createClient();
  
  // Récupérer tous les élèves
  const { data: eleves, error } = await supabase
    .from('eleves')
    .select('*');
  
  if (error) throw error;
  
  const totalEleves = eleves.length;
  
  // COMPTABILITÉ INVERSE pour les champs manquants
  const avecThematique = eleves.filter(e => e.categorie && e.categorie.trim() !== '' && e.categorie !== 'À définir').length;
  const sansThematique = totalEleves - avecThematique;
  
  const avecProblematique = eleves.filter(e => e.problematique && e.problematique.trim() !== '' && e.problematique !== 'À définir').length;
  const sansProblematique = totalEleves - avecProblematique;
  
  // Pour les sources, ajustez selon votre schéma de base de données
  // Si vous n'avez pas de champs source_1, source_2, etc., utilisez une autre logique
  const avecSources = eleves.filter(e => 
    // Logique actuelle - à adapter selon vos champs réels
    e.source_1 && e.source_1.trim() !== '' &&
    e.source_2 && e.source_2.trim() !== '' &&
    e.source_3 && e.source_3.trim() !== '' &&
    e.source_4 && e.source_4.trim() !== '' &&
    e.source_5 && e.source_5.trim() !== ''
  ).length;
  const sansSources = totalEleves - avecSources;
  
  const avecGuide = eleves.filter(e => e.guide_id).length;
  const sansGuide = totalEleves - avecGuide;
  
  const avecLecteurInterne = eleves.filter(e => e.lecteur_interne_id).length;
  const sansLecteurInterne = totalEleves - avecLecteurInterne;
  
  const avecLecteurExterne = eleves.filter(e => e.lecteur_externe_id).length;
  const sansLecteurExterne = totalEleves - avecLecteurExterne;
  
  return {
    totalEleves,
    avecThematique,
    avecProblematique,
    avecSources,
    avecGuide,
    avecLecteurInterne,
    avecLecteurExterne,
    // Ajoutez les champs "sans" pour l'affichage des cartes
    sansThematique,
    sansProblematique,
    sansSources,
    sansGuide,
    sansLecteurInterne,
    sansLecteurExterne,
    pourcentageThematique: totalEleves > 0 ? (avecThematique / totalEleves) * 100 : 0,
    pourcentageProblematique: totalEleves > 0 ? (avecProblematique / totalEleves) * 100 : 0,
    pourcentageSources: totalEleves > 0 ? (avecSources / totalEleves) * 100 : 0,
    pourcentageGuide: totalEleves > 0 ? (avecGuide / totalEleves) * 100 : 0,
    pourcentageLecteurInterne: totalEleves > 0 ? (avecLecteurInterne / totalEleves) * 100 : 0,
    pourcentageLecteurExterne: totalEleves > 0 ? (avecLecteurExterne / totalEleves) * 100 : 0,
  };

  
}



