'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  categorie: string;
  guide_nom: string;
  guide_initiale: string;
  convocation_mars: string;
  convocation_avril: string;
  presence_9_mars: boolean;
  presence_10_mars: boolean;
  presence_16_avril: boolean;
  presence_17_avril: boolean;
}

export default function CoordinateurDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
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
    if (typeof window !== 'undefined') {
      const userType = localStorage.getItem('userType');
      const name = localStorage.getItem('userName');
      
      if (userType !== 'coordinateur') {
        router.push('/');
        return;
      }
      
      setUserName(name || '');
    }
    loadEleves();
  }, [router]);

  const loadEleves = async () => {
    try {
      const { data, error } = await supabase
        .from('vue_eleves_complete')
        .select('*')
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (error) throw error;
      setEleves(data || []);
      setFilteredEleves(data || []);
    } catch (err) {
      console.error('Erreur chargement élèves:', err);
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

  const handleUpdate = async (eleveId: string, field: string, value: string | boolean) => {
    try {
      await supabase
        .from('eleves')
        .update({ [field]: value })
        .eq('id', eleveId);

      loadEleves();
      setEditingCell(null);
    } catch (err) {
      console.error('Erreur mise à jour:', err);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
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
      <div className="max-w-[1600px] mx-auto">
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
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Classe</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Nom</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Prénom</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Guide</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Catégorie</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 w-48">Problématique</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Conv. Mars</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Conv. Avril</th>
                <th className="px-2 py-3 text-center font-semibold text-gray-700" colSpan={2}>Présences Mars</th>
                <th className="px-2 py-3 text-center font-semibold text-gray-700" colSpan={2}>Présences Avril</th>
              </tr>
              <tr className="bg-gray-50 text-xs">
                <th colSpan={8}></th>
                <th className="px-2 py-2 text-center border-l">9</th>
                <th className="px-2 py-2 text-center">10</th>
                <th className="px-2 py-2 text-center border-l">16</th>
                <th className="px-2 py-2 text-center">17</th>
              </tr>
            </thead>
            <tbody>
              {filteredEleves.map((eleve) => (
                <tr key={eleve.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-3">{eleve.classe}</td>
                  <td className="px-3 py-3 font-medium">{eleve.nom}</td>
                  <td className="px-3 py-3">{eleve.prenom}</td>
                  <td className="px-3 py-3">
                    {eleve.guide_nom} {eleve.guide_initiale}.
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={eleve.categorie || ''}
                      onChange={(e) => handleUpdate(eleve.id, 'categorie', e.target.value)}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Catégorie"
                    />
                  </td>
                  <td className="px-3 py-3">
                    {editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                      <textarea
                        defaultValue={eleve.problematique || ''}
                        onBlur={(e) => handleUpdate(eleve.id, 'problematique', e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        rows={2}
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded max-w-xs truncate"
                        title={eleve.problematique || '-'}
                      >
                        {eleve.problematique || '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={eleve.convocation_mars || ''}
                      onChange={(e) => handleUpdate(eleve.id, 'convocation_mars', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs"
                    >
                      {CONVOCATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt || '-'}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={eleve.convocation_avril || ''}
                      onChange={(e) => handleUpdate(eleve.id, 'convocation_avril', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs"
                    >
                      {CONVOCATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt || '-'}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-3 text-center border-l">
                    <input
                      type="checkbox"
                      checked={eleve.presence_9_mars}
                      onChange={(e) => handleUpdate(eleve.id, 'presence_9_mars', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={eleve.presence_10_mars}
                      onChange={(e) => handleUpdate(eleve.id, 'presence_10_mars', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-3 text-center border-l">
                    <input
                      type="checkbox"
                      checked={eleve.presence_16_avril}
                      onChange={(e) => handleUpdate(eleve.id, 'presence_16_avril', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={eleve.presence_17_avril}
                      onChange={(e) => handleUpdate(eleve.id, 'presence_17_avril', e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
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
