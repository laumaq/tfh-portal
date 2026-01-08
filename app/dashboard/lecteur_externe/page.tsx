// app/dashboard/lecteur_externe/page.tsx
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
  date_defense: string | null;
  heure_defense: string | null;
  localisation_defense: string | null;
  lecteur_interne_id: string | null;
  lecteur_externe_id: string | null;
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

type TabType = 'dashboard' | 'selection';

export default function LecteurExterneDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userLecteurExterneId, setUserLecteurExterneId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [categories, setCategories] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');

    if (userType !== 'lecteur_externe' || !userId) {
      router.push('/');
      return;
    }

    setUserName(name || '');
    setUserLecteurExterneId(userId);
    loadData(userId);
  }, [router]);

  const loadData = async (lecteurExterneId: string) => {
    try {
      setLoading(true);
      
      // Charger les guides pour l'affichage
      const { data: guidesData } = await supabase
        .from('guides')
        .select('id, nom, initiale');
      setGuides(guidesData || []);

      // Charger les élèves assignés à ce lecteur externe
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .eq('lecteur_externe_id', lecteurExterneId)
        .order('date_defense', { ascending: true, nullsFirst: true })
        .order('heure_defense', { ascending: true, nullsFirst: true })
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

      // Formater les données
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

      // Pour l'onglet Sélection: charger les élèves qui n'ont pas encore de lecteur externe
      // OU dont le lecteur externe est l'utilisateur actuel
      const { data: elevesDispoData, error: elevesDispoError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale)
        `)
        .or(`lecteur_externe_id.is.null,lecteur_externe_id.eq.${lecteurExterneId}`)
        // Filtrer les élèves qui ont une catégorie
        .not('categorie', 'is', null)
        .not('categorie', 'eq', '')
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesDispoError) throw elevesDispoError;

      const elevesDispoFormatted = (elevesDispoData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_initiale: eleve.guide?.initiale || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_initiale: eleve.lecteur_interne?.initiale || '-'
      }));

      setElevesDisponibles(elevesDispoFormatted);

      // Extraire les catégories uniques pour le filtre
      const uniqueCategories = Array.from(
        new Set(elevesDispoFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      // Pré-sélectionner les élèves où l'utilisateur est déjà lecteur externe
      const preSelected = elevesDispoFormatted
        .filter(e => e.lecteur_externe_id === lecteurExterneId)
        .map(e => e.id);
      setSelectedEleves(preSelected);

    } catch (err) {
      console.error('Erreur chargement des données:', err);
    } finally {
      setLoading(false);
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

  const handleSaveLecteurExterne = async () => {
    try {
      // D'abord, retirer ce lecteur externe de tous les élèves
      const { error: clearError } = await supabase
        .from('eleves')
        .update({ lecteur_externe_id: null })
        .eq('lecteur_externe_id', userLecteurExterneId);

      if (clearError) throw clearError;

      // Ensuite, ajouter ce lecteur externe aux élèves sélectionnés
      if (selectedEleves.length > 0) {
        const { error: updateError } = await supabase
          .from('eleves')
          .update({ lecteur_externe_id: userLecteurExterneId })
          .in('id', selectedEleves);

        if (updateError) throw updateError;
      }

      // Recharger les données
      await loadData(userLecteurExterneId);
      
      // Revenir à l'onglet dashboard
      setActiveTab('dashboard');
      
      alert('Modifications enregistrées avec succès !');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Formater la date en français
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Formater l'heure
  const formatHeure = (heureString: string | null) => {
    if (!heureString) return '-';
    return heureString.substring(0, 5);
  };

  // Compter les élèves par statut
  const elevesAvecDateDefense = eleves.filter(e => e.date_defense !== null).length;
  const elevesSansDateDefense = eleves.length - elevesAvecDateDefense;

  if (loading && activeTab === 'dashboard') {
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Lecteur Externe</h1>
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
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'dashboard'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard ({eleves.length} élève(s))
          </button>
          <button
            onClick={() => setActiveTab('selection')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'selection'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sélection des élèves
          </button>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'dashboard' ? (
          <>
            {eleves.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun élève assigné</h3>
                <p className="text-gray-500">Aucun élève ne vous est actuellement assigné comme lecteur externe.</p>
                <button
                  onClick={() => setActiveTab('selection')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sélectionner des élèves
                </button>
              </div>
            ) : (
              <>
                {/* Statistiques */}
                <div className="flex gap-4 mb-6">
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {eleves.length} élève{eleves.length > 1 ? 's' : ''} assigné{eleves.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    {elevesAvecDateDefense} avec date de défense
                  </span>
                  <span className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                    {elevesSansDateDefense} sans date
                  </span>
                </div>

                {/* Tableau des élèves assignés */}
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <div className="min-w-[1200px] md:min-w-full">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Défense</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lieu</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eleves.map((eleve) => (
                          <tr key={eleve.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                              {eleve.date_defense ? (
                                <div className={`px-2 py-1 rounded ${new Date(eleve.date_defense) < new Date() ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {formatDate(eleve.date_defense)}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {formatHeure(eleve.heure_defense)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {eleve.localisation_defense || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{eleve.classe}</td>
                            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                              {eleve.nom} {eleve.prenom}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {eleve.categorie || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {eleve.guide_nom} {eleve.guide_initiale}.
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}.
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {eleve.mediateur_prenom} {eleve.mediateur_nom}
                            </td>
                            <td className="px-4 py-3 text-sm max-w-xs">
                              <div className="line-clamp-2">
                                {eleve.problematique || '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          /* Onglet Sélection des élèves */
          <div className="space-y-6">
            {/* En-tête avec filtres et bouton de sauvegarde */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">Sélection des élèves comme lecteur externe</h2>
                  <p className="text-gray-600 mt-1">
                    Sélectionnez les élèves pour lesquels vous serez lecteur externe.
                    Les élèves sélectionnés n'apparaîtront plus dans la liste des autres lecteurs externes.
                    N'oubliez pas d'enregistrer si vous cochez des élèves dans la liste.
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
                      onClick={handleSaveLecteurExterne}
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredElevesDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                        <td className="px-4 py-3 text-sm">
                          {eleve.lecteur_interne_nom ? (
                            <span>
                              {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}.
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Note informative */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              {activeTab === 'dashboard' && 'Ce tableau affiche les élèves qui vous sont assignés comme lecteur externe, triés par date de défense.'}
              {activeTab === 'selection' && 'Sélectionnez les élèves pour lesquels vous serez lecteur externe. Un élève ne peut avoir qu\'un seul lecteur externe.'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
