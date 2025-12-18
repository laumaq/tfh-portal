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
  guide_nom?: string;
  guide_initiale?: string;
}

export default function GuideDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userGuideId, setUserGuideId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
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
    loadEleves(userId);
  }, [router]);

  const loadEleves = async (guideId: string) => {
    try {
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('*')
        .eq('guide_id', guideId)
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

      // Mettre à jour l'état local immédiatement
      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value } : eleve
      ));
      
      setEditingCell(null);
    } catch (err) {
      console.error('Erreur mise à jour convocation:', err);
      // Recharger les données en cas d'erreur
      loadEleves(userGuideId);
    }
  };

  // Fonction pour obtenir la couleur d'une convocation
  const getConvocationColor = (value: string) => {
    const option = CONVOCATION_OPTIONS.find(opt => opt.value === value);
    return option ? option.color : 'bg-gray-100';
  };

  // Fonction pour obtenir le label court (pour affichage compact)
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
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start"
                      >
                        {eleve.problematique || '-'}
                      </div>
                    )}
                  </td>
                  
                  {/* Colonne Convocation Mars */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <select
                        value={eleve.convocation_mars || ''}
                        onChange={(e) => handleUpdateConvocation(eleve.id, 'convocation_mars', e.target.value)}
                        className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(eleve.convocation_mars || '')}`}
                        title={eleve.convocation_mars || 'Non défini'}
                      >
                        {CONVOCATION_OPTIONS.map(opt => (
                          <option 
                            key={opt.value} 
                            value={opt.value}
                            className={opt.color}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className={`text-xs px-2 py-1 rounded truncate ${getConvocationColor(eleve.convocation_mars || '')}`}>
                        {getShortLabel(eleve.convocation_mars || '')}
                      </div>
                    </div>
                  </td>
                  
                  {/* Colonne Convocation Avril */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <select
                        value={eleve.convocation_avril || ''}
                        onChange={(e) => handleUpdateConvocation(eleve.id, 'convocation_avril', e.target.value)}
                        className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(eleve.convocation_avril || '')}`}
                        title={eleve.convocation_avril || 'Non défini'}
                      >
                        {CONVOCATION_OPTIONS.map(opt => (
                          <option 
                            key={opt.value} 
                            value={opt.value}
                            className={opt.color}
                          >
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

        {/* Note informative */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              Vous pouvez modifier la problématique en cliquant dessus, et les convocations via les menus déroulants.
              Les modifications sont enregistrées automatiquement.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
