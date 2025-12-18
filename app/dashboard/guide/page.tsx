// app/dashboard/guide/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // <-- CORRECTION : Import unique

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
}

export default function GuideDashboard() { // <-- CORRECTION : Nom du composant
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');

    // CORRECTION : Vérifier qu'on est bien un guide
    if (userType !== 'guide' || !userId) {
      router.push('/');
      return;
    }

    setUserName(name || '');
    loadEleves(userId); // On charge les élèves de CE guide
  }, [router]);

  const loadEleves = async (guideId: string) => {
    try {
      // CORRECTION : Charger uniquement les élèves assignés à ce guide
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('*')
        .eq('guide_id', guideId) // <-- Filtre crucial
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;
      setEleves(elevesData || []);
    } catch (err) {
      console.error('Erreur chargement des élèves:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement de vos élèves...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Guide</h1>
            <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
            <p className="text-sm text-gray-500">Vous avez {eleves.length} élève(s) assigné(s).</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Convoc. Mars</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Convoc. Avril</th>
              </tr>
            </thead>
            <tbody>
              {eleves.map((eleve) => (
                <tr key={eleve.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                  <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                  <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
                  <td className="px-4 py-3 text-sm">{eleve.problematique || '-'}</td>
                  <td className="px-4 py-3 text-sm">{eleve.convocation_mars || '-'}</td>
                  <td className="px-4 py-3 text-sm">{eleve.convocation_avril || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
