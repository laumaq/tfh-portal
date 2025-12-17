// app/dashboard/coordinateur/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  guide_nom?: string;
  guide_initiale?: string;
}

interface Guide {
  id: string;
  nom: string;
  initiale: string;
}

type SortField = 'nom' | 'prenom' | 'classe' | 'categorie' | 'guide_nom' | 'convocation_mars' | 'convocation_avril';
type SortDirection = 'asc' | 'desc';

export default function CoordinateurDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  
  // Filtres
  const [showConvoques, setShowConvoques] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<string>('Toutes');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('Toutes');
  const [selectedGuide, setSelectedGuide] = useState<string>('Tous');
  
  // Tri
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const router = useRouter();

  const CONVOCATION_OPTIONS = [
    '',
    'Non, l\'élève atteint bien les objectifs',
    'Oui, l\'élève n\'atteint pas les objectifs',
    'Oui, n\'a pas avancé',
    'Oui n\'a pas communiqué'
  ];

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const name = localStorage.getItem('userName');
    
    if (userType !== 'coordinateur') {
      router.push('/');
      return;
    }
    
    setUserName(name || '');
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      // Charger les guides
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides')
        .select('id, nom, initiale')
        .order('nom', { ascending: true });

      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // Charger les élèves
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('*')
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

      // Fusionner les données élèves avec les guides
      const elevesWithGuides = (elevesData || []).map(eleve => {
        const guide = guidesData?.find(g => g.id === eleve.guide_id);
        return {
          ...eleve,
          guide_nom: guide?.nom || '-',
          guide_initiale: guide?.initiale || '-'
        };
      });

      setEleves(elevesWithGuides);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extraire les options uniques pour les filtres
  const classesOptions = useMemo(() => {
    const classes = [...new Set(eleves.map(e => e.classe))].sort();
    return ['Toutes', ...classes];
  }, [eleves]);

  const categoriesOptions = useMemo(() => {
    const categories = [...new Set(eleves.map(e => e.categorie))].filter(Boolean).sort();
    return ['Toutes', ...categories];
  }, [eleves]);

  const guidesOptions = useMemo(() => {
    const guideNames = [...new Set(eleves.map(e => e.guide_nom))].filter(name => name && name !== '-').sort();
    return ['Tous', ...guideNames];
  }, [eleves]);

  // Fonction de tri
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Appliquer les filtres et le tri
  const filteredAndSortedEleves = useMemo(() => {
    let filtered = [...eleves];

    // Filtre convoqués
    if (showConvoques) {
      filtered = filtered.filter(e => 
        (e.convocation_mars && e.convocation_mars.startsWith('Oui')) ||
        (e.convocation_avril && e.convocation_avril.startsWith('Oui'))
      );
    }

    // Filtre classe
    if (selectedClasse !== 'Toutes') {
      filtered = filtered.filter(e => e.classe === selectedClasse);
    }

    // Filtre catégorie
    if (selectedCategorie !== 'Toutes') {
      filtered = filtered.filter(e => e.categorie === selectedCategorie);
    }

    // Filtre guide
    if (selectedGuide !== 'Tous') {
      filtered = filtered.filter(e => e.guide_nom === selectedGuide);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Gérer les valeurs undefined/null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Comparaison
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [eleves, showConvoques, selectedClasse, selectedCategorie, selectedGuide, sortField, sortDirection]);

  const handleUpdate = async (eleveId: string, field: string, value: string) => {
    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;

      loadData();
      setEditingCell(null);
    } catch (err) {
      console.error('Erreur mise à jour:', err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Icônes de tri simples (remplacement heroicons)
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Coordinateur</h1>
            <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {filteredAndSortedEleves.length} élève{filteredAndSortedEleves.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-500">🔍</span>
            <h2 className="text-lg font-semibold text-gray-700">Filtres</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtre Convoqués */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="convoques"
                checked={showConvoques}
                onChange={(e) => setShowConvoques(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <label htmlFor="convoques" className="text-sm font-medium cursor-pointer">
                Convoqués seulement
              </label>
            </div>

            {/* Filtre Classe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classe
              </label>
              <select
                value={selectedClasse}
                onChange={(e) => setSelectedClasse(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {classesOptions.map(classe => (
                  <option key={classe} value={classe}>{classe}</option>
                ))}
              </select>
            </div>

            {/* Filtre Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {categoriesOptions.map(categorie => (
                  <option key={categorie} value={categorie}>{categorie}</option>
                ))}
              </select>
            </div>

            {/* Filtre Guide */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guide
              </label>
              <select
                value={selectedGuide}
                onChange={(e) => setSelectedGuide(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {guidesOptions.map(guide => (
                  <option key={guide} value={guide}>{guide}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Boutons de réinitialisation */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setShowConvoques(false);
                setSelectedClasse('Toutes');
                setSelectedCategorie('Toutes');
                setSelectedGuide('Tous');
              }}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  {/* En-têtes cliquables pour le tri */}
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('classe')}
                      className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Classe
                      <SortIcon field="classe" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('nom')}
                      className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Nom
                      <SortIcon field="nom" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('prenom')}
                      className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Prénom
                      <SortIcon field="prenom" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('guide_nom')}
                      className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Guide
                      <SortIcon field="guide_nom" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[300px]">
                    Problématique
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('convocation_mars')}
                      className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Convoc. 9-10 mars
                      <SortIcon field="convocation_mars" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('convocation_avril')}
                      className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Convoc. 16-17 avril
                      <SortIcon field="convocation_avril" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEleves.map((eleve) => (
                  <tr key={eleve.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                    <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                    <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
                    <td className="px-4 py-3 text-sm">
                      {eleve.guide_nom} {eleve.guide_initiale}.
                    </td>
                    <td className="px-4 py-3 text-sm align-top">
                      {editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                        <textarea
                          defaultValue={eleve.problematique}
                          onBlur={(e) => handleUpdate(eleve.id, 'problematique', e.target.value)}
                          className="w-full border rounded px-2 py-1 whitespace-pre-wrap break-words"
                          rows={4}
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                          className="cursor-pointer hover:bg-gray-100 p-2 rounded whitespace-pre-wrap break-words min-h-[60px]"
                          title={eleve.problematique}
                        >
                          {eleve.problematique || '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm align-top">
                      <select
                        value={eleve.convocation_mars || ''}
                        onChange={(e) => handleUpdate(eleve.id, 'convocation_mars', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {CONVOCATION_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt || '-'}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm align-top">
                      <select
                        value={eleve.convocation_avril || ''}
                        onChange={(e) => handleUpdate(eleve.id, 'convocation_avril', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {CONVOCATION_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt || '-'}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedEleves.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              Aucun élève ne correspond aux filtres sélectionnés
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
