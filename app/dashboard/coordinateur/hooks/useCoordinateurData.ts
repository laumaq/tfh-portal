'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve, Guide, LecteurExterne, Mediateur, Coordinateur } from '../types';

export function useCoordinateurData() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [coordinateurs, setCoordinateurs] = useState<Coordinateur[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Charger guides
      const { data: guidesData } = await supabase
        .from('guides')
        .select('id, nom, prenom, initiale')
        .order('nom', { ascending: true });
      setGuides(guidesData || []);

      // Charger lecteurs externes
      const { data: lecteursData } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom, email');
      setLecteursExternes(lecteursData || []);

      // Charger élèves avec jointures
      const { data: elevesData } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, prenom),
          lecteur_interne:guides!lecteur_interne_id (nom, prenom),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .order('classe')
        .order('nom');

      const elevesFormatted = (elevesData || []).map(eleve => ({
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
      
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = () => {
    loadData();
  };

  return {
    eleves,
    guides,
    lecteursExternes,
    mediateurs,
    coordinateurs,
    loading,
    refreshData
  };
}
