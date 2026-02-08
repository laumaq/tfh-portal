// app/dashboard/direction/tabs/LecteurInterneTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve } from '../../../coordinateur/types';

interface LecteurInterneTabProps {
  eleves: Eleve[];
  guideId: string;
  onRefresh: () => void;
}

export default function LecteurInterneTab({ eleves, guideId, onRefresh }: LecteurInterneTabProps) {
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lecteurInterneEnabled, setLecteurInterneEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [displaySettings, setDisplaySettings] = useState({
    lecteur_interne_voir_eleves: true,
    lecteur_interne_voir_guides: true,
  });

  useEffect(() => {
    loadLecteurInterneData(guideId);
    loadSystemSettings();
  }, [guideId]);

  const loadLecteurInterneData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Charger les élèves qui n'ont pas encore de lecteur interne
      // OU dont le lecteur interne est l'utilisateur actuel
      const { data: elevesDispoData, error } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, prenom),
          lecteur_interne:guides!lecteur_interne_id (nom, prenom)
        `)
        .or(`lecteur_interne_id.is.null,lecteur_interne_id.eq.${userId}`)
        .neq('guide_id', userId)
        .not('categorie', 'is', null)
        .not('categorie', 'eq', '')
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (error) throw error;

      const elevesDispoFormatted = (elevesDispoData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_prenom: eleve.guide?.prenom || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_prenom: eleve.lecteur_interne?.prenom || '-'
      }));

      setElevesDisponibles(elevesDispoFormatted);

      // Extraire les catégories uniques pour le filtre
      const uniqueCategories = Array.from(
        new Set(elevesDispoFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      // Pré-sélectionner les élèves où l'utilisateur est déjà lecteur interne
      const preSelected = elevesDispoFormatted
        .filter(e => e.lecteur_interne_id === guideId)
        .map(e => e.id);
      setSelectedEleves(preSelected);

    } catch (err) {
      console.error('Erreur chargement données lecteur interne:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      // Charger le paramètre d'activation
      const { data: enabledData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'guide_lecteur_interne_enabled')
        .single();
      
      if (enabledData) {
        setLecteurInterneEnabled(enabledData.setting_value === 'true');
      }

      // Charger les paramètres d'affichage
      const { data: displayData } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'lecteur_interne_voir_eleves',
          'lecteur_interne_voir_guides'
        ]);
    
      if (displayData) {
        const settings: any = {};
        displayData.forEach(setting => {
          settings[setting.setting_key] = setting.setting_value === 'true';
        });
        setDisplaySettings(prev => ({ ...prev, ...settings }));
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    } finally {
      setSettingsLoaded(true);
    }
  };

  // Filtrer les élèves disponibles par catégorie
  const filteredElevesDisponibles = elevesDisponibles.filter(eleve => {
    if (selectedCategorie === 'toutes') return true;
    return eleve.categorie === selectedCategorie;
  });

  const handleToggleSelection = (eleveId: string) => {
    setSelectedEleves(prev => {
      if (prev.includes(eleveId)) {
        return prev.filter(id => id !== eleveId);
      } else {
        return [...prev, eleveId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEleves.length === filteredElevesDisponibles.length) {
      setSelectedEleves([]);
    } else {
      setSelectedEleves(filteredElevesDisponibles.map(e => e.id));
    }
  };

  const handleSaveLecteurInterne = async () => {
    setSaving(true);
    try {
      // D'abord, retirer ce guide comme lecteur interne de tous les élèves
      const { error: clearError } = await supabase
        .from('eleves')
        .update({ lecteur_interne_id: null })
        .eq('lecteur_interne_id', guideId);

      if (clearError) throw clearError;

      // Ensuite, ajouter ce guide comme lecteur interne aux élèves sélectionnés
      if (selectedEleves.length > 0) {
        const { error: updateError } = await supabase
          .from('eleves')
          .update({ lecteur_interne_id: guideId })
          .in('id', selectedEleves);

        if (updateError) throw updateError;
      }

      // Recharger les données
      await loadLecteurInterneData(guideId);
      onRefresh();
      
      alert('Sélection enregistrée avec succès !');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const calculateColspan = () => {
    let count = 0;
    
    // Colonnes toujours visibles
    count += 1; // Checkbox
    
    // Colonnes conditionnelles
    if (displaySettings.lecteur_interne_voir_eleves) {
      count += 2; // Classe + Élève
    }
    
    count += 2; // Catégorie + Problématique
    
    if (displaySettings.lecteur_interne_voir_guides) count += 1;
    
    return count;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des TFH disponibles...</p>
        </div>
      </div>
    );
  }

  if (!lecteurInterneEnabled && settingsLoaded) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Fonctionnalité désactivée</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          La fonction "Lecteur interne" n'est actuellement pas activée par l'administration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">Lecteur interne</h2>
            <p className="text-gray-600 mt-1">
              Sélectionnez les TFH pour lesquels vous serez lecteur interne.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-medium text-sm">
              {selectedEleves.length} sélectionné(s)
            </span>
            <button
              onClick={handleSaveLecteurInterne}
              disabled={saving}
              className={`px-4 py-2 rounded-lg font-medium ${
                saving
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer la sélection'}
            </button>
          </div>
        </div>
      </div>

      {/* Indicateur d'état */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-purple-800">
              Mode sélection lecteur interne - Direction
            </h3>
            <p className="text-sm text-purple-600 mt-1">
              Sélectionnez les élèves pour lesquels vous serez lecteur interne.
              Un élève ne peut avoir qu'un seul lecteur interne.
            </p>
          </div>
          <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            {filteredElevesDisponibles.length} TFH disponible(s)
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Filtrer par catégorie:
            </label>
            <select
              value={selectedCategorie}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="toutes">Toutes les catégories</option>
              {categories.map(categorie => (
                <option key={categorie} value={categorie}>
                  {categorie}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {selectedEleves.length === filteredElevesDisponibles.length 
                ? "Tout désélectionner" 
                : "Tout sélectionner"}
            </button>
            <span className="text-sm text-gray-600">
              {filteredElevesDisponibles.length} TFH dans la catégorie sélectionnée
            </span>
          </div>
        </div>
      </div>

      {/* Tableau des élèves disponibles */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                <input
                  type="checkbox"
                  checked={selectedEleves.length === filteredElevesDisponibles.length && filteredElevesDisponibles.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </th>
              {displaySettings.lecteur_interne_voir_eleves && (
                <>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                </>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date défense</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure défense</th>
              {displaySettings.lecteur_interne_voir_guides && ( 
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredElevesDisponibles.length === 0 ? (
              <tr>
                <td colSpan={calculateColspan()} className="px-4 py-8 text-center text-gray-500">
                  {selectedCategorie === 'toutes' 
                    ? "Aucun TFH disponible pour le moment."
                    : `Aucun TFH trouvé dans la catégorie "${selectedCategorie}".`}
                </td>
              </tr>
            ) : (
              filteredElevesDisponibles.map((eleve) => (
                <tr key={eleve.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedEleves.includes(eleve.id)}
                      onChange={() => handleToggleSelection(eleve.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </td>
                  
                  {displaySettings.lecteur_interne_voir_eleves && ( 
                    <>
                      <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{eleve.nom}</span>
                          <span>{eleve.prenom}</span>
                        </div>
                      </td>
                    </>
                  )}
                  
                  <td className="px-4 py-3 text-sm">
                    {eleve.categorie ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {eleve.categorie}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-sm">
                    <div className="max-w-xs whitespace-pre-wrap break-words min-h-[40px]">
                      {eleve.problematique || '-'}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {eleve.date_defense 
                      ? new Date(eleve.date_defense).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      : 'Non définie'}
                  </td>
                  
                  <td className="px-4 py-3 text-sm">
                    {eleve.heure_defense 
                      ? eleve.heure_defense.substring(0, 5)
                      : 'Non définie'}
                  </td>
                  
                  {displaySettings.lecteur_interne_voir_guides && ( 
                    <td className="px-4 py-3 text-sm">
                      {eleve.guide_nom} {eleve.guide_prenom}.
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Note informative */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-700 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <span>
            • Sélectionnez les TFH pour lesquels vous serez lecteur interne<br/>
            • Un élève ne peut avoir qu'un seul lecteur interne<br/>
            • N'oubliez pas de cliquer sur "Enregistrer la sélection" après vos modifications<br/>
            • Les modifications sont effectives immédiatement
          </span>
        </p>
      </div>
    </div>
  );
}
