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
  convocation_mars: string;
  convocation_avril: string;
}

export default function GuideDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
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
      const userId = localStorage.getItem('userId');
      const name = localStorage.getItem('userName');
      
      if (userType !== 'guide' || !userId) {
        router.push('/');
        return;
      }
      
      setUserName(name || '');
      loadEleves(userId);
    }
  }, [router]);

  const loadEleves = async (guideId: string) => {
    try {
      const { data, error } = await supabase
        .from('vue_eleves_complete')
        .select('*')
        .eq('guide_id', guideId)
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (error) throw error;
      setEleves(data || []);
    } catch (err) {
      console.error('Erreur chargement élèves:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (eleveId: string, field: string, value: string) => {
    try {
      await supabase
        .from('eleves')
        .update({ [field]: value })
        .eq('id', eleveId);

      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('userId');
        if (userId) loadEleves(userId);
      }
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
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Guide</h1>
            <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>

        {eleves.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">Aucun élève associé</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Classe</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Prénom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Catégorie</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Problématique</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Conv. 9-10 mars</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Conv. 16-17 avril</th>
                </tr>
              </thead>
              <tbody>
                {eleves.map((eleve) => (
                  <tr key={eleve.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                    <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                    <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
                    <td className="px-4 py-3 text-sm">{eleve.categorie || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div 
                        className="whitespace-pre-wrap break-words max-w-xs" 
                        title={eleve.problematique || '-'}
                      >
                        {eleve.problematique || '-'}
                      </div>
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
        )}
      </div>
    </div>
  );
}



