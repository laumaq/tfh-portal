// app/dashboard/coordinateur/page.tsx
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
  guide_nom?: string;
  guide_initiale?: string;
}

interface Guide {
  id: string;
  nom: string;
  initiale: string;
}

export default function CoordinateurDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [filteredEleves, setFilteredEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showConvoques, setShowConvoques] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
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
        .select('id, nom, initiale');

      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // Charger les élèves avec les nouvelles colonnes
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
      setFilteredEleves(elevesWithGuides);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showConvoques) {
      const convoques = eleves.filter(e => 
        (e.convocation_mars && e.convocation_mars.startsWith('Oui')) ||
        (e.convocation_avril && e.convocation_avril.startsWith('Oui'))
      );
      setFilteredEleves(convoques);
    } else {
      setFilteredEleves(eleves);
    }
  }, [showConvoques, eleves]);

  const handleUpdate = async (eleveId: string, field: string, value: string) => {
    try {
      // Mettre à jour directement dans la table eleves
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;

      // Recharger les données
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Coordinateur</h1>
            <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConvoques}
                onChange={(e) => setShowConvoques(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">
                Afficher uniquement les élèves convoqués
              </span>
            </label>
            <span className="text-sm text-gray-500">
              ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''})
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Convoc. 9-10 mars</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Convoc. 16-17 avril</th>
              </tr>
            </thead>
            <tbody>
              {filteredEleves.map((eleve) => (
                <tr key={eleve.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                  <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                  <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
                  <td className="px-4 py-3 text-sm">
                    {eleve.guide_nom} {eleve.guide_initiale}.
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                      <textarea
                        defaultValue={eleve.problematique}
                        onBlur={(e) => handleUpdate(eleve.id, 'problematique', e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      >
                        {eleve.problematique || '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
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
                  <td className="px-4 py-3 text-sm">
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
      </div>
    </div>
  );
}
