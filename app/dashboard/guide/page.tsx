// app/dashboard/guide/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  categorie: string;
  guide_id: string;
  convocation_mars: string;
  convocation_avril: string;
  date_defense: string | null;
  heure_defense: string | null;
  localisation_defense: string | null;
  lecteur_interne_id: string | null;
  lecteur_externe_id: string | null;
  mediateur_id: string | null;
  guide_nom?: string;
  guide_initiale?: string;
  lecteur_interne_nom?: string;
  lecteur_interne_initiale?: string;
  lecteur_externe_nom?: string;
  lecteur_externe_prenom?: string;
  mediateur_nom?: string;
  mediateur_prenom?: string;
}

interface Guide {
  id: string;
  nom: string;
  initiale: string;
}

interface LecteurExterne {
  id: string;
  nom: string;
  prenom: string;
}

interface Mediateur {
  id: string;
  nom: string;
  prenom: string;
}

type TabType = 'guide' | 'lecteur-interne' | 'defenses';

export default function GuideDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [defenses, setDefenses] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDefenses, setLoadingDefenses] = useState(false);
  const [userName, setUserName] = useState('');
  const [userGuideId, setUserGuideId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('guide');
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [categories, setCategories] = useState<string[]>([]);
  const router = useRouter();

  // Options de convocation identiques à celles du coordinateur
  const CONVOCATION_OPTIONS = [
    { value: '', label: '-', color: 'bg-gray-100' },
    { 
      value: 'Non, l\'élève atteint bien les objectifs', 
      label: 'Non, l\'élève atteint bien les objectifs',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    { 
      value: 'Oui, l\'élève n\'atteint pas les objectifs', 
      label: 'Oui, l\'élève n\'atteint pas les objectifs',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    { 
      value: 'Oui, n\'a pas avancé', 
      label: 'Oui, n\'a pas avancé',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    { 
      value: 'Oui n\'a pas communiqué', 
      label: 'Oui n\'a pas communiqué',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    }
  ];

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');

    if (userType !== 'guide' || !userId) {
      router.push('/');
      return;
    }

    setUserName(name || '');
    setUserGuideId(userId);
    loadData(userId);
  }, [router]);

  const loadData = async (guideId: string) => {
    try {
      setLoading(true);
      
      // Charger les guides (pour le dropdown des lecteurs internes)
      const { data: guidesData } = await supabase
        .from('guides')
        .select('id, nom, initiale');
      setGuides(guidesData || []);

      // Charger les lecteurs externes et médiateurs pour l'affichage des défenses
      const { data: lecteursExternesData } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom');
      setLecteursExternes(lecteursExternesData || []);

      const { data: mediateursData } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom');
      setMediateurs(mediateursData || []);

      // Charger les élèves assignés à ce guide
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .eq('guide_id', guideId)
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

      // Formater les données des élèves
      const elevesFormatted = (elevesData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_initiale: eleve.guide?.initiale || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_initiale: eleve.lecteur_interne?.initiale || '-',
        lecteur_externe_nom: eleve.lecteur_externe?.nom || '-',
        lecteur_externe_prenom: eleve.lecteur_externe?.prenom || '-',
        mediateur_nom: eleve.mediateur?.nom || '-',
        mediateur_prenom: eleve.mediateur?.prenom || '-'
      }));

      setEleves(elevesFormatted);

      // Pour l'onglet Lecteur interne: charger les élèves qui n'ont pas encore de lecteur interne
      // OU dont le lecteur interne est l'utilisateur actuel
      const { data: elevesDispoData, error: elevesDispoError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale)
        `)
        .or(`lecteur_interne_id.is.null,lecteur_interne_id.eq.${guideId}`)
        // Filtrer les élèves qui ont une catégorie
        .not('categorie', 'is', null)
        .not('categorie', 'eq', '')
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesDispoError) throw elevesDispoError;

      const elevesDispoFormatted = (elevesDispoData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_initiale: eleve.guide?.initiale || '-'
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
      console.error('Erreur chargement des données:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDefenses = async (guideId: string) => {
    try {
      setLoadingDefenses(true);
      
      // Charger les défenses où l'utilisateur est soit guide, soit lecteur interne
      // Maintenant on charge TOUS les élèves, même sans date de défense programmée
      const { data: defensesData, error: defensesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .or(`guide_id.eq.${guideId},lecteur_interne_id.eq.${guideId}`)
        .order('date_defense', { ascending: true, nullsFirst: true })
        .order('heure_defense', { ascending: true, nullsFirst: true })
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (defensesError) throw defensesError;

      const defensesFormatted = (defensesData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_initiale: eleve.guide?.initiale || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_initiale: eleve.lecteur_interne?.initiale || '-',
        lecteur_externe_nom: eleve.lecteur_externe?.nom || '-',
        lecteur_externe_prenom: eleve.lecteur_externe?.prenom || '-',
        mediateur_nom: eleve.mediateur?.nom || '-',
        mediateur_prenom: eleve.mediateur?.prenom || '-'
      }));

      setDefenses(defensesFormatted);
    } catch (err) {
      console.error('Erreur chargement des défenses:', err);
    } finally {
      setLoadingDefenses(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'defenses' && userGuideId) {
      loadDefenses(userGuideId);
    }
  }, [activeTab, userGuideId]);

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
    try {
      // D'abord, retirer ce guide comme lecteur interne de tous les élèves
      const { error: clearError } = await supabase
        .from('eleves')
        .update({ lecteur_interne_id: null })
        .eq('lecteur_interne_id', userGuideId);

      if (clearError) throw clearError;

      // Ensuite, ajouter ce guide comme lecteur interne aux élèves sélectionnés
      if (selectedEleves.length > 0) {
        const { error: updateError } = await supabase
          .from('eleves')
          .update({ lecteur_interne_id: userGuideId })
          .in('id', selectedEleves);

        if (updateError) throw updateError;
      }

      // Recharger les données
      await loadData(userGuideId);
      
      alert('Modifications enregistrées avec succès !');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Fonction pour mettre à jour une convocation
  const handleUpdateConvocation = async (eleveId: string, field: string, value: string) => {
    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;

      // Mettre à jour l'état local
      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value } : eleve
      ));
      
      setEditingCell(null);
    } catch (err) {
      console.error('Erreur mise à jour convocation:', err);
      loadData(userGuideId);
    }
  };

  // Fonction pour obtenir la couleur d'une convocation
  const getConvocationColor = (value: string) => {
    const option = CONVOCATION_OPTIONS.find(opt => opt.value === value);
    return option ? option.color : 'bg-gray-100';
  };

  // Fonction pour obtenir le label court
  const getShortLabel = (value: string) => {
    if (!value) return '-';
    if (value.includes('atteint bien')) return 'Objectifs atteints';
    if (value.includes('n\'atteint pas')) return 'Objectifs non atteints';
    if (value.includes('pas avancé')) return 'Pas avancé';
    if (value.includes('pas communiqué')) return 'Pas communiqué';
    return value;
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  if (loading && activeTab === 'guide') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement de vos élèves...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Guide</h1>
            <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm md:text-base"
          >
            Déconnexion
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'guide'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Guide ({eleves.length} élève(s))
          </button>
          <button
            onClick={() => setActiveTab('lecteur-interne')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'lecteur-interne'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Lecteur interne
          </button>
          <button
            onClick={() => setActiveTab('defenses')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'defenses'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Défenses programmées
          </button>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'guide' ? (
          <>
            {/* Légende des couleurs */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Légende des convocations:</p>
              <div className="flex flex-wrap gap-2">
                {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
                  <div key={opt.value} className={`${opt.color} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                    <div className="w-2 h-2 rounded-full" style={{
                      backgroundColor: opt.color.includes('green') ? '#10B981' :
                                     opt.color.includes('yellow') ? '#F59E0B' :
                                     opt.color.includes('orange') ? '#F97316' :
                                     opt.color.includes('red') ? '#EF4444' : '#6B7280'
                    }}></div>
                    {getShortLabel(opt.label)}
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau des élèves assignés */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Convoc. 9-10 mars</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Convoc. 16-17 avril</th>
                  </tr>
                </thead>
                <tbody>
                  {eleves.map((eleve) => (
                    <tr key={eleve.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                      <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                      <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
                      <td className="px-4 py-3 text-sm">
                        {editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                          <textarea
                            defaultValue={eleve.problematique}
                            onBlur={(e) => handleUpdateConvocation(eleve.id, 'problematique', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start whitespace-pre-wrap break-words"
                          >
                            {eleve.problematique || '-'}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <select
                            value={eleve.convocation_mars || ''}
                            onChange={(e) => handleUpdateConvocation(eleve.id, 'convocation_mars', e.target.value)}
                            className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(eleve.convocation_mars || '')}`}
                            title={eleve.convocation_mars || 'Non défini'}
                          >
                            {CONVOCATION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value} className={opt.color}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className={`text-xs px-2 py-1 rounded truncate ${getConvocationColor(eleve.convocation_mars || '')}`}>
                            {getShortLabel(eleve.convocation_mars || '')}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <select
                            value={eleve.convocation_avril || ''}
                            onChange={(e) => handleUpdateConvocation(eleve.id, 'convocation_avril', e.target.value)}
                            className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(eleve.convocation_avril || '')}`}
                            title={eleve.convocation_avril || 'Non défini'}
                          >
                            {CONVOCATION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value} className={opt.color}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className={`text-xs px-2 py-1 rounded truncate ${getConvocationColor(eleve.convocation_avril || '')}`}>
                            {getShortLabel(eleve.convocation_avril || '')}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'lecteur-interne' ? (
          <div className="space-y-6">
            {/* En-tête avec filtres et bouton de sauvegarde */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">Sélection des élèves comme lecteur interne</h2>
                  <p className="text-gray-600 mt-1">
                    Sélectionnez les élèves pour lesquels vous serez lecteur interne.
                    Les élèves sélectionnés n'apparaîtront plus dans la liste des autres guides.
                  </p>
                </div>
                <div className="flex flex-col md:items-end gap-3">
                  {/* Filtre par catégorie */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Filtrer par catégorie:
                    </label>
                    <select
                      value={selectedCategorie}
                      onChange={(e) => setSelectedCategorie(e.target.value)}
                      className="border rounded px-3 py-1 text-sm"
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
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      {selectedEleves.length} élève(s) sélectionné(s)
                    </span>
                    <button
                      onClick={handleSaveLecteurInterne}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Enregistrer la sélection
                    </button>
                  </div>
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredElevesDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {selectedCategorie === 'toutes' 
                          ? "Aucun élève disponible pour le moment."
                          : `Aucun élève trouvé dans la catégorie "${selectedCategorie}".`}
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
                        <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                        <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                        <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
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
                          {eleve.guide_nom} {eleve.guide_initiale}.
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Onglet Défenses programmées */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800">Défenses programmées</h2>
              <p className="text-gray-600 mt-1">
                Liste de tous vos élèves (en tant que guide ou lecteur interne), avec ou sans défense programmée.
              </p>
            </div>

            {loadingDefenses ? (
              <div className="text-center py-12">
                <div className="text-xl">Chargement des données...</div>
              </div>
            ) : defenses.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun élève trouvé</h3>
                <p className="text-gray-500">
                  Vous n'avez pas d'élèves assignés (en tant que guide ou lecteur interne).
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Localisation</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut défense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defenses.map((eleve) => {
                      const hasDefense = eleve.date_defense || eleve.heure_defense || eleve.localisation_defense;
                      const isGuide = eleve.guide_id === userGuideId;
                      const isLecteurInterne = eleve.lecteur_interne_id === userGuideId;
                      
                      return (
                        <tr key={eleve.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                            {formatDate(eleve.date_defense)}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.heure_defense || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                          <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                            {eleve.nom} {eleve.prenom}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {eleve.categorie ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                {eleve.categorie}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="max-w-xs whitespace-pre-wrap break-words min-h-[40px]">
                              {eleve.problematique || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.guide_nom} {eleve.guide_initiale}.
                            {isGuide && (
                              <span className="ml-1 text-xs text-blue-600">(vous)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.lecteur_interne_nom ? (
                              <span>
                                {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}.
                                {isLecteurInterne && (
                                  <span className="ml-1 text-xs text-blue-600">(vous)</span>
                                )}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.lecteur_externe_nom ? (
                              <span>
                                {eleve.lecteur_externe_prenom} {eleve.lecteur_externe_nom}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.mediateur_nom ? (
                              <span>
                                {eleve.mediateur_prenom} {eleve.mediateur_nom}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {eleve.localisation_defense || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {hasDefense ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Programmé
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Non programmé
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Note informative */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              {activeTab === 'guide' && 'Vous pouvez modifier la problématique en cliquant dessus, et les convocations via les menus déroulants.'}
              {activeTab === 'lecteur-interne' && 'Sélectionnez les élèves pour lesquels vous serez lecteur interne. Un élève ne peut avoir qu\'un seul lecteur interne.'}
              {activeTab === 'defenses' && 'Affichage de tous vos élèves (guide ou lecteur interne), avec ou sans défense programmée.'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
