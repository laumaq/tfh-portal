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
  convocation_mars: string;
  convocation_avril: string;
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

export default function LecteurExterneDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
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
    loadEleves(userId);
    loadGuides();
    loadLecteursExternes();
  }, [router]);

  const loadGuides = async () => {
    try {
      const { data, error } = await supabase
        .from('guides')
        .select('id, nom, initiale');

      if (error) throw error;
      setGuides(data || []);
    } catch (err) {
      console.error('Erreur chargement guides:', err);
    }
  };

  const loadLecteursExternes = async () => {
    try {
      const { data, error } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom');

      if (error) throw error;
      setLecteursExternes(data || []);
    } catch (err) {
      console.error('Erreur chargement lecteurs externes:', err);
    }
  };

  const loadEleves = async (lecteurExterneId: string) => {
    try {
      // Charger les élèves assignés à ce médiateur
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom)
        `)
        .eq('lecteur_externe_id', lecteurId)
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
        lecteur_externe_prenom: eleve.lecteur_externe?.prenom || '-'
      }));

      setEleves(elevesFormatted);
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
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Lecteur externe</h1>
            <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
            <div className="flex gap-4 mt-2">
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
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>

        {eleves.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun élève assigné</h3>
            <p className="text-gray-500">Aucun élève ne vous est actuellement assigné comme médiateur.</p>
          </div>
        ) : (
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Conv. Mars</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Conv. Avril</th>
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
                        {eleve.lecteur_externe_prenom} {eleve.lecteur_externe_nom}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        <div className="line-clamp-2">
                          {eleve.problematique || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          eleve.convocation_mars?.includes('atteint bien') ? 'bg-green-100 text-green-800' :
                          eleve.convocation_mars?.includes('n\'atteint pas') ? 'bg-yellow-100 text-yellow-800' :
                          eleve.convocation_mars?.includes('pas avancé') ? 'bg-red-100 text-red-800' :
                          eleve.convocation_mars?.includes('pas communiqué') ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {eleve.convocation_mars ? eleve.convocation_mars.split(',')[0] : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          eleve.convocation_avril?.includes('atteint bien') ? 'bg-green-100 text-green-800' :
                          eleve.convocation_avril?.includes('n\'atteint pas') ? 'bg-yellow-100 text-yellow-800' :
                          eleve.convocation_avril?.includes('pas avancé') ? 'bg-red-100 text-red-800' :
                          eleve.convocation_avril?.includes('pas communiqué') ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {eleve.convocation_avril ? eleve.convocation_avril.split(',')[0] : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <span>
              Ce tableau affiche les élèves qui vous sont assignés comme médiateur, triés par date de défense.
              Les défenses passées sont en vert, les futures en bleu.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
