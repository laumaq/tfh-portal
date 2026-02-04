// Fichier : ./app/dashboard/coordinateur/utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Récupérer les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Met à jour un champ spécifique d'un élève dans la base de données
 */
export async function updateEleveField(
  eleveId: string, 
  field: string, 
  value: string
): Promise<boolean> {
  try {
    // Vérifier que le champ existe dans la table eleves
    const allowedFields = [
      'thematique', 'problematique', 'categorie', 'classe',
      'source_1', 'source_2', 'source_3', 'source_4', 'source_5'
    ];
    
    if (!allowedFields.includes(field)) {
      console.error(`Champ non autorisé: ${field}`);
      return false;
    }

    // Préparer l'objet de mise à jour
    const updateData: Record<string, string> = {};
    updateData[field] = value;

    // Effectuer la mise à jour
    const { error } = await supabase
      .from('eleves')
      .update(updateData)
      .eq('id', eleveId);

    if (error) {
      console.error('Erreur Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    return false;
  }
}

/**
 * Récupère tous les élèves avec leurs données
 */
export async function fetchAllEleves() {
  try {
    const { data, error } = await supabase
      .from('eleves')
      .select('*')
      .order('classe', { ascending: true })
      .order('nom', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des élèves:', error);
    return [];
  }
}

/**
 * Récupère un élève spécifique par son ID
 */
export async function fetchEleveById(id: string) {
  try {
    const { data, error } = await supabase
      .from('eleves')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'élève ${id}:`, error);
    return null;
  }
}

/**
 * Met à jour plusieurs champs d'un élève en une seule requête
 */
export async function updateEleveFields(
  eleveId: string, 
  fields: Record<string, any>
): Promise<boolean> {
  try {
    // Filtrer les champs pour ne garder que ceux autorisés
    const allowedFields = [
      'thematique', 'problematique', 'categorie', 'classe',
      'source_1', 'source_2', 'source_3', 'source_4', 'source_5',
      'nom', 'prenom', 'initiale'
    ];
    
    const filteredFields: Record<string, any> = {};
    
    Object.keys(fields).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredFields[key] = fields[key];
      }
    });

    if (Object.keys(filteredFields).length === 0) {
      console.error('Aucun champ valide à mettre à jour');
      return false;
    }

    // Effectuer la mise à jour
    const { error } = await supabase
      .from('eleves')
      .update(filteredFields)
      .eq('id', eleveId);

    if (error) {
      console.error('Erreur Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour multiple:', error);
    return false;
  }
}

/**
 * Supprime un élève de la base de données
 */
export async function deleteEleve(eleveId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('eleves')
      .delete()
      .eq('id', eleveId);

    if (error) {
      console.error('Erreur Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return false;
  }
}
