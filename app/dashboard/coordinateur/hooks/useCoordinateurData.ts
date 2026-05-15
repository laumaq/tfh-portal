// /app/dashboard/coordinateur/hooks/useCoordinateurData.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Eleve, 
  Guide, 
  LecteurExterne, 
  Mediateur, 
  Coordinateur,
  Externe 
} from '../types';

// Ajouter le type pour les demandes
export interface DemandeDesinscription {
  id: string;
  demandeur_id: string;
  demandeur_type: 'guide' | 'externe';
  demandeur_nom: string;
  demandeur_prenom: string;
  demandeur_email: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  eleve_classe: string;
  role_type: 'guide' | 'lecteur_interne' | 'lecteur_externe' | 'mediateur';
  defense_date: string;
  defense_horaire: string;
  defense_localisation: string;
  statut: 'en_attente' | 'approuvee' | 'refusee' | 'annulee';
  commentaire_demandeur: string | null;
  commentaire_coordinateur: string | null;
  created_at: string;
  traitee_le: string | null;
  traitee_par: string | null;
}

export function useCoordinateurData() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [externes, setExternes] = useState<Externe[]>([]);
  const [coordinateurs, setCoordinateurs] = useState<Coordinateur[]>([]);
  const [demandesEnAttente, setDemandesEnAttente] = useState<DemandeDesinscription[]>([]);
  const [demandesTraitees, setDemandesTraitees] = useState<DemandeDesinscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCoordinateur, setCurrentCoordinateur] = useState<{nom: string, prenom: string, id: string} | null>(null);

  const loadDemandes = useCallback(async (coordinateurId: string) => {
    try {
      // Demandes en attente
      const { data: enAttente, error: error1 } = await supabase
        .from('demandes_desinscription')
        .select('*')
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false });

      if (!error1) {
        setDemandesEnAttente(enAttente || []);
      }

      // Demandes traitées (30 derniers jours)
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      
      const { data: traitees, error: error2 } = await supabase
        .from('demandes_desinscription')
        .select('*')
        .in('statut', ['approuvee', 'refusee'])
        .gte('traitee_le', dateLimite.toISOString())
        .order('traitee_le', { ascending: false });

      if (!error2) {
        setDemandesTraitees(traitees || []);
      }

    } catch (err) {
      console.error('Erreur chargement demandes:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      // Charger les guides
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides')
        .select('id, nom, prenom, initiale, email, mot_de_passe, accepte_numerique')
        .order('nom', { ascending: true });
      
      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // Charger les externes 
      const { data: externesData, error: externesError } = await supabase
        .from('externes')
        .select('id, nom, prenom, email, telephone, lecteur_externe_id, mediateur_id, accepte_numerique')
        .order('nom', { ascending: true });

      if (externesError) {
        console.error('Erreur chargement externes:', externesError);
        setExternes([]);
      } else {
        setExternes(externesData || []);
      }

      // Charger les coordinateurs
      const { data: coordinateursData, error: coordinateursError } = await supabase
        .from('coordinateurs')
        .select('id, nom, prenom, initiale, mot_de_passe');

      if (coordinateursError) {
        setCoordinateurs([]);
      } else {
        setCoordinateurs(coordinateursData || []);
      }
      
      // Charger les élèves avec jointures
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, prenom),
          lecteur_interne:guides!lecteur_interne_id (nom, prenom),
          lecteur_externe:externes!lecteur_externe_id (nom, prenom),
          mediateur:externes!mediateur_id (nom, prenom)
        `)
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

      const elevesFormatted: Eleve[] = (elevesData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_prenom: eleve.guide?.prenom || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_prenom: eleve.lecteur_interne?.prenom || '-',
        lecteur_externe_nom: eleve.lecteur_externe?.nom || '-',
        lecteur_externe_prenom: eleve.lecteur_externe?.prenom || '-',
        mediateur_nom: eleve.mediateur?.nom || '-',
        mediateur_prenom: eleve.mediateur?.prenom || '-'
      }));

      setEleves(elevesFormatted);

      // Extraire les catégories uniques
      const uniqueCategories = Array.from(
        new Set(elevesFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      const loadCurrentCoordinateur = async () => {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const { data } = await supabase
            .from('coordinateurs')
            .select('id, nom, prenom, mot_de_passe')
            .eq('id', userId)
            .single();
          
          if (data) {
            setCurrentCoordinateur(data);
            // Charger les demandes une fois qu'on a l'ID coordinateur
            await loadDemandes(data.id);
          }
        }
      };

      await loadCurrentCoordinateur();

    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, [loadDemandes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = () => {
    setLoading(true);
    loadData();
  };

  const updateEleveLocal = (updatedEleve: Eleve) => {
    setEleves(prev => prev.map(e => 
      e.id === updatedEleve.id ? updatedEleve : e
    ));
  };
  
  // Fonction pour approuver une demande
  const approuverDemande = async (demandeId: string, commentaire?: string) => {
    if (!currentCoordinateur) return false;
    
    try {
      const response = await supabase.rpc('traiter_demande_desinscription', {
        p_demande_id: demandeId,
        p_nouveau_statut: 'approuvee',
        p_commentaire: commentaire || null,
        p_coordinateur_id: currentCoordinateur.id
      });
      
      if (response.error) throw response.error;
      
      await refreshData();
      return true;
    } catch (err) {
      console.error('Erreur approbation:', err);
      return false;
    }
  };
  
  // Fonction pour refuser une demande
  const refuserDemande = async (demandeId: string, commentaire?: string) => {
    if (!currentCoordinateur) return false;
    
    try {
      const response = await supabase.rpc('traiter_demande_desinscription', {
        p_demande_id: demandeId,
        p_nouveau_statut: 'refusee',
        p_commentaire: commentaire || null,
        p_coordinateur_id: currentCoordinateur.id
      });
      
      if (response.error) throw response.error;
      
      await refreshData();
      return true;
    } catch (err) {
      console.error('Erreur refus:', err);
      return false;
    }
  };
  
  return {
    eleves,
    guides,
    lecteursExternes,
    mediateurs,
    externes,
    coordinateurs,
    currentCoordinateur,
    categories,
    loading,
    refreshData,
    updateEleveLocal,
    demandesEnAttente,
    demandesTraitees,
    approuverDemande,
    refuserDemande
  };
}
