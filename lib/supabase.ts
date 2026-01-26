// lib/supabase.ts
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
}

// Fonction pour récupérer les élèves avec données manquantes
export async function getElevesWithMissingData(missingField: string) {
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
      // Exemple avec des champs source_1 à source_5
      query = query.or(
        'source_1.is.null,source_1.eq."",' +
        'source_2.is.null,source_2.eq."",' +
        'source_3.is.null,source_3.eq."",' +
        'source_4.is.null,source_4.eq."",' +
        'source_5.is.null,source_5.eq.""'
      );
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
  
  if (error) {
    console.error('Erreur récupération élèves:', error);
    throw error;
  }
  return data || [];
}

export async function getStats() {
  // Récupérer tous les élèves
  const { data: eleves, error } = await supabase
    .from('eleves')
    .select('*');
  
  if (error) {
    console.error('Erreur récupération stats:', error);
    throw error;
  }
  
  const elevesList = eleves || [];
  const totalEleves = elevesList.length;
  
  if (totalEleves === 0) {
    return {
      totalEleves: 0,
      avecThematique: 0,
      avecProblematique: 0,
      avecSources: 0,
      avecGuide: 0,
      avecLecteurInterne: 0,
      avecLecteurExterne: 0,
      sansThematique: 0,
      sansProblematique: 0,
      sansSources: 0,
      sansGuide: 0,
      sansLecteurInterne: 0,
      sansLecteurExterne: 0,
      pourcentageThematique: 0,
      pourcentageProblematique: 0,
      pourcentageSources: 0,
      pourcentageGuide: 0,
      pourcentageLecteurInterne: 0,
      pourcentageLecteurExterne: 0,
    };
  }
  
  // COMPTABILITÉ INVERSE pour les champs manquants
  const avecThematique = elevesList.filter(e => e.categorie && e.categorie.trim() !== '' && e.categorie !== 'À définir').length;
  const avecProblematique = elevesList.filter(e => e.problematique && e.problematique.trim() !== '' && e.problematique !== 'À définir').length;
  
  // Pour les sources, vérifiez que vos champs existent
  const avecSources = elevesList.filter(e => {
    return e.source_1 && e.source_1.trim() !== '' &&
           e.source_2 && e.source_2.trim() !== '' &&
           e.source_3 && e.source_3.trim() !== '' &&
           e.source_4 && e.source_4.trim() !== '' &&
           e.source_5 && e.source_5.trim() !== '';
  }).length;
  
  const avecGuide = elevesList.filter(e => e.guide_id).length;
  const avecLecteurInterne = elevesList.filter(e => e.lecteur_interne_id).length;
  const avecLecteurExterne = elevesList.filter(e => e.lecteur_externe_id).length;
  
  return {
    totalEleves,
    avecThematique,
    avecProblematique,
    avecSources,
    avecGuide,
    avecLecteurInterne,
    avecLecteurExterne,
    // Ajoutez les champs "sans" pour l'affichage des cartes
    sansThematique: totalEleves - avecThematique,
    sansProblematique: totalEleves - avecProblematique,
    sansSources: totalEleves - avecSources,
    sansGuide: totalEleves - avecGuide,
    sansLecteurInterne: totalEleves - avecLecteurInterne,
    sansLecteurExterne: totalEleves - avecLecteurExterne,
    pourcentageThematique: (avecThematique / totalEleves) * 100,
    pourcentageProblematique: (avecProblematique / totalEleves) * 100,
    pourcentageSources: (avecSources / totalEleves) * 100,
    pourcentageGuide: (avecGuide / totalEleves) * 100,
    pourcentageLecteurInterne: (avecLecteurInterne / totalEleves) * 100,
    pourcentageLecteurExterne: (avecLecteurExterne / totalEleves) * 100,
  };
}
