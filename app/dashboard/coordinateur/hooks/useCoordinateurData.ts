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

export function useCoordinateurData() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [externes, setExternes] = useState<Externe[]>([]); // ← NOUVEAU
  const [coordinateurs, setCoordinateurs] = useState<Coordinateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCoordinateur, setCurrentCoordinateur] = useState<{nom: string, prenom: string} | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Charger les guides
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides')
        .select('id, nom, prenom, initiale, email, mot_de_passe')
        .order('nom', { ascending: true });
      
      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // Charger les lecteurs externes (à garder pour compatibilité)
      const { data: lecteursExternesData, error: lecteursError } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom, email, mot_de_passe');

      if (lecteursError) throw lecteursError;
      setLecteursExternes(lecteursExternesData || []);

      // Charger les médiateurs (à garder pour compatibilité)
      const { data: mediateursData, error: mediateursError } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom, email, mot_de_passe');

      if (mediateursError) {
        setMediateurs([]);
      } else {
        setMediateurs(mediateursData || []);
      }

      // ← NOUVEAU : Charger les externes (table unifiée)
      const { data: externesData, error: externesError } = await supabase
        .from('externes')
        .select('*')
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
      
      // Charger les élèves avec jointures (corrigé pour utiliser externes)
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
            .select('nom, prenom, mot_de_passe')
            .eq('id', userId)
            .single();
          
          if (data) {
            setCurrentCoordinateur(data);
          }
        }
      };

      await loadCurrentCoordinateur();

    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
    updateEleveLocal
  };
}
