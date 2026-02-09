// app/dashboard/coordinateur/hooks/useDirectionData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Eleve, 
  Guide, 
  LecteurExterne, 
  Mediateur 
} from '../../coordinateur/types';

export function useDirectionData() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentGuide, setCurrentGuide] = useState<Guide | null>(null);

  const loadData = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        console.error('Aucun utilisateur connecté');
        setLoading(false);
        return;
      }

      // 1. Charger les infos du guide (membre de la direction)
      const { data: guideData, error: guideError } = await supabase
        .from('guides')
        .select('id, nom, prenom, initiale, email, mot_de_passe')
        .eq('id', userId)
        .single();
      
      if (guideError) {
        console.error('Erreur chargement guide direction:', guideError);
        throw guideError;
      }
      
      if (!guideData) {
        console.error('Guide non trouvé pour la direction');
        setLoading(false);
        return;
      }
      
      setCurrentGuide(guideData);

      // 2. Charger les élèves où la direction est guide OU lecteur interne
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, prenom),
          lecteur_interne:guides!lecteur_interne_id (nom, prenom),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .or(`guide_id.eq.${userId},lecteur_interne_id.eq.${userId}`)
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) {
        console.error('Erreur chargement élèves direction:', elevesError);
        throw elevesError;
      }

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

      // 3. Charger les guides (pour les menus déroulants, lecture seule)
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides')
        .select('id, nom, prenom, initiale, email')
        .order('nom', { ascending: true });
      
      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // 4. Charger les lecteurs externes (lecture seule)
      const { data: lecteursExternesData, error: lecteursError } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom, email');

      if (lecteursError) throw lecteursError;
      setLecteursExternes(lecteursExternesData || []);

      // 5. Charger les médiateurs (lecture seule)
      const { data: mediateursData, error: mediateursError } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom, email');

      if (mediateursError) {
        console.warn('Pas de médiateurs trouvés:', mediateursError);
        setMediateurs([]);
      } else {
        setMediateurs(mediateursData || []);
      }

      // 6. Extraire les catégories uniques des élèves de la direction
      const uniqueCategories = Array.from(
        new Set(elevesFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

    } catch (err) {
      console.error('Erreur chargement données direction:', err);
      // Réinitialiser les données en cas d'erreur
      setEleves([]);
      setGuides([]);
      setLecteursExternes([]);
      setMediateurs([]);
      setCategories([]);
      setCurrentGuide(null);
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

  // Fonction pour mettre à jour localement un élève
  const updateEleveLocal = (updatedEleve: Eleve) => {
    setEleves(prev => prev.map(e => 
      e.id === updatedEleve.id ? updatedEleve : e
    ));
  };

  // Fonction pour vérifier si la direction peut éditer cet élève
  const canEditEleve = (eleve: Eleve): boolean => {
    const userId = localStorage.getItem('userId');
    if (!userId || !eleve) return false;
    
    return eleve.guide_id === userId || eleve.lecteur_interne_id === userId;
  };

  return {
    eleves,
    guides,
    lecteursExternes,
    mediateurs,
    categories,
    currentGuide,
    loading,
    refreshData,
    updateEleveLocal,
    canEditEleve
  };
}
