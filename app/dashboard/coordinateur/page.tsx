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
  presence_9_mars: boolean | null;
  presence_10_mars: boolean | null;
  presence_16_avril: boolean | null;
  presence_17_avril: boolean | null;
  // Nouveaux champs pour les défenses
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

type TabType = 'convocations' | 'defenses';

export default function CoordinateurDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [filteredEleves, setFilteredEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showConvoques, setShowConvoques] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('convocations');
  const router = useRouter();

  const CONVOCATION_OPTIONS = [
    { value: '', label: '-', color: 'bg-gray-100' },
    { 
      value: 'Atteint bien les objectifs', 
      label: 'Atteint bien les objectifs',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    { 
      value: 'N\'atteint pas les objectifs', 
      label: 'N\'atteint pas les objectifs',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    { 
      value: 'N\'a pas avancé', 
      label: 'N\'a pas avancé',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    { 
      value: 'N\'a pas communiqué', 
      label: 'N\'a pas communiqué',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    }
  ];

  // Fonction pour forcer le mode paysage sur mobile
  const checkAndForceLandscape = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && !isLandscape) {
        setIsLandscape(true);
        const landscapeMsg = document.getElementById('landscape-message');
        if (landscapeMsg) {
          landscapeMsg.classList.remove('hidden');
        }
      } else {
        setIsLandscape(false);
      }
    }
  };

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const name = localStorage.getItem('userName');
    
    if (userType !== 'coordinateur') {
      router.push('/');
      return;
    }
    
    setUserName(name || '');
    loadData();
    
    checkAndForceLandscape();
    
    window.addEventListener('resize', checkAndForceLandscape);
    window.addEventListener('orientationchange', checkAndForceLandscape);
    
    return () => {
      window.removeEventListener('resize', checkAndForceLandscape);
      window.removeEventListener('orientationchange', checkAndForceLandscape);
    };
  }, [router]);

  const loadData = async () => {
    try {
      // Charger les guides
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides')
        .select('id, nom, initiale');

      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // Charger les lecteurs externes
      const { data: lecteursExternesData, error: lecteursError } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom');

      if (lecteursError) throw lecteursError;
      setLecteursExternes(lecteursExternesData || []);

      // Charger les médiateurs (si vous avez une table médiateurs)
      const { data: mediateursData, error: mediateursError } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom');

      if (mediateursError) {
        console.warn('Table médiateurs non trouvée ou erreur:', mediateursError);
        setMediateurs([]);
      } else {
        setMediateurs(mediateursData || []);
      }

      // Charger les élèves avec toutes les données
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
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
      setFilteredEleves(elevesFormatted);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'convocations' && showConvoques) {
      const convoques = eleves.filter(e => 
        (e.convocation_mars && e.convocation_mars.startsWith('Oui')) ||
        (e.convocation_avril && e.convocation_avril.startsWith('Oui'))
      );
      setFilteredEleves(convoques);
    } else {
      setFilteredEleves(eleves);
    }
  }, [showConvoques, eleves, activeTab]);

  const cyclePresenceState = (currentState: boolean | null): boolean | null => {
    if (currentState === null) return true;
    if (currentState === true) return false;
    return null;
  };

  const handlePresenceUpdate = async (eleveId: string, field: string, currentValue: boolean | null) => {
    try {
      const newValue = cyclePresenceState(currentValue);
      
      const updateData: any = {};
      updateData[field] = newValue;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;

      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: newValue } : eleve
      ));
      
      setFilteredEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: newValue } : eleve
      ));
    } catch (err) {
      console.error('Erreur mise à jour présence:', err);
      loadData();
    }
  };

  const handleUpdate = async (eleveId: string, field: string, value: string) => {
    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;

      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value } : eleve
      ));
      
      setFilteredEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value } : eleve
      ));

      setEditingCell(null);
    } catch (err) {
      console.error('Erreur mise à jour:', err);
      loadData();
    }
  };

  const handleSelectUpdate = async (eleveId: string, field: string, value: string) => {
    try {
      const updateData: any = {};
      updateData[field] = value === '' ? null : value;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;

      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
      ));
      
      setFilteredEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
      ));
    } catch (err) {
      console.error('Erreur mise à jour select:', err);
      loadData();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const getConvocationColor = (value: string) => {
    const option = CONVOCATION_OPTIONS.find(opt => opt.value === value);
    return option ? option.color : 'bg-gray-100';
  };

  const getConvocationLabel = (value: string) => {
    const option = CONVOCATION_OPTIONS.find(opt => opt.value === value);
    return option ? option.label : '-';
  };

  const getPresenceStyles = (value: boolean | null) => {
    switch (value) {
      case null:
        return {
          bgColor: 'bg-gray-100',
          hoverColor: 'hover:bg-gray-200',
          textColor: 'text-gray-400',
          icon: '?',
          title: 'Non défini'
        };
      case true:
        return {
          bgColor: 'bg-green-100',
          hoverColor: 'hover:bg-green-200',
          textColor: 'text-green-600',
          icon: '✓',
          title: 'Présent'
        };
      case false:
        return {
          bgColor: 'bg-red-100',
          hoverColor: 'hover:bg-red-200',
          textColor: 'text-red-600',
          icon: '✗',
          title: 'Absent'
        };
    }
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
      {/* Message pour le mode paysage sur mobile */}
      <div 
        id="landscape-message" 
        className="hidden fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-lg p-6 max-w-sm text-center">
          <div className="text-4xl mb-4">↻</div>
          <h3 className="text-lg font-semibold mb-2">Pivotez votre appareil</h3>
          <p className="text-gray-600 mb-4">
            Pour une meilleure expérience, veuillez utiliser votre téléphone en mode paysage.
          </p>
          <button
            onClick={() => {
              const msg = document.getElementById('landscape-message');
              if (msg) msg.classList.add('hidden');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            J'ai compris
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Coordinateur</h1>
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
            onClick={() => {
              setActiveTab('convocations');
              setShowConvoques(false);
            }}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'convocations'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Convocations & Présences
          </button>
          <button
            onClick={() => {
              setActiveTab('defenses');
              setShowConvoques(false);
            }}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'defenses'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Gestion des Défenses
          </button>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'convocations' ? (
          <>
            <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
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
              
              {/* Légende des couleurs */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
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
                          {opt.label.split(',')[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Légende de présence:</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200">?</span>
                        Non défini
                      </div>
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-200">✓</span>
                        Présent
                      </div>
                      <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-200">✗</span>
                        Absent
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Cliquez pour faire tourner: ? → ✓ → ✗ → ?
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau des convocations */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="min-w-[1300px] md:min-w-full">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Classe</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Nom</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prénom</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Guide</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Catégorie</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Problématique</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Convoc. 9-10 mars</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 9 mars</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 10 mars</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Convoc. 16-17 avril</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 16 avril</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 17 avril</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEleves.map((eleve) => {
                      const presence9Mars = getPresenceStyles(eleve.presence_9_mars);
                      const presence10Mars = getPresenceStyles(eleve.presence_10_mars);
                      const presence16Avril = getPresenceStyles(eleve.presence_16_avril);
                      const presence17Avril = getPresenceStyles(eleve.presence_17_avril);
                      
                      return (
                        <tr key={eleve.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.classe}</td>
                          <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">{eleve.nom}</td>
                          <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.prenom}</td>
                          <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                            {eleve.guide_nom} {eleve.guide_initiale}.
                          </td>
                          <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                            {editingCell?.id === eleve.id && editingCell?.field === 'categorie' ? (
                              <input
                                type="text"
                                defaultValue={eleve.categorie || ''}
                                onBlur={(e) => handleUpdate(eleve.id, 'categorie', e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => setEditingCell({id: eleve.id, field: 'categorie'})}
                                className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                              >
                                {eleve.categorie || '-'}
                              </div>
                            )}
                          </td>
                          
                          <td className="px-3 py-3 text-xs md:text-sm">
                            {editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                              <textarea
                                defaultValue={eleve.problematique}
                                onBlur={(e) => handleUpdate(eleve.id, 'problematique', e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs md:text-sm"
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
                          
                          <td className="px-3 py-3">
                            <select
                              value={eleve.convocation_mars || ''}
                              onChange={(e) => handleUpdate(eleve.id, 'convocation_mars', e.target.value)}
                              className={`w-full border rounded px-2 py-1 text-xs md:text-sm ${getConvocationColor(eleve.convocation_mars || '')}`}
                              title={getConvocationLabel(eleve.convocation_mars || '')}
                            >
                              {CONVOCATION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className={opt.color}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <div className={`mt-1 text-xs px-2 py-1 rounded ${getConvocationColor(eleve.convocation_mars || '')} truncate`}>
                              {getConvocationLabel(eleve.convocation_mars || '').split(',')[0]}
                            </div>
                          </td>
                          
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handlePresenceUpdate(eleve.id, 'presence_9_mars', eleve.presence_9_mars)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence9Mars.bgColor} ${presence9Mars.hoverColor} ${presence9Mars.textColor} font-bold text-lg`}
                              title={`${presence9Mars.title} (cliquer pour changer)`}
                            >
                              {presence9Mars.icon}
                            </button>
                          </td>
                          
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handlePresenceUpdate(eleve.id, 'presence_10_mars', eleve.presence_10_mars)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence10Mars.bgColor} ${presence10Mars.hoverColor} ${presence10Mars.textColor} font-bold text-lg`}
                              title={`${presence10Mars.title} (cliquer pour changer)`}
                            >
                              {presence10Mars.icon}
                            </button>
                          </td>
                          
                          <td className="px-3 py-3">
                            <select
                              value={eleve.convocation_avril || ''}
                              onChange={(e) => handleUpdate(eleve.id, 'convocation_avril', e.target.value)}
                              className={`w-full border rounded px-2 py-1 text-xs md:text-sm ${getConvocationColor(eleve.convocation_avril || '')}`}
                              title={getConvocationLabel(eleve.convocation_avril || '')}
                            >
                              {CONVOCATION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className={opt.color}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <div className={`mt-1 text-xs px-2 py-1 rounded ${getConvocationColor(eleve.convocation_avril || '')} truncate`}>
                              {getConvocationLabel(eleve.convocation_avril || '').split(',')[0]}
                            </div>
                          </td>
                          
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handlePresenceUpdate(eleve.id, 'presence_16_avril', eleve.presence_16_avril)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence16Avril.bgColor} ${presence16Avril.hoverColor} ${presence16Avril.textColor} font-bold text-lg`}
                              title={`${presence16Avril.title} (cliquer pour changer)`}
                            >
                              {presence16Avril.icon}
                            </button>
                          </td>
                          
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handlePresenceUpdate(eleve.id, 'presence_17_avril', eleve.presence_17_avril)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence17Avril.bgColor} ${presence17Avril.hoverColor} ${presence17Avril.textColor} font-bold text-lg`}
                              title={`${presence17Avril.title} (cliquer pour changer)`}
                            >
                              {presence17Avril.icon}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Onglet Gestion des Défenses */
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="min-w-[1400px] md:min-w-full">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Classe</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Nom</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prénom</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Catégorie</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Problématique</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Guide</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Lecteur Interne</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Lecteur Externe</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Médiateur</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Date Défense</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Heure Défense</th>
                    <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Localisation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEleves.map((eleve) => (
                    <tr key={eleve.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.classe}</td>
                      <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">{eleve.nom}</td>
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.prenom}</td>
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.categorie || '-'}
                      </td>
                      <td className="px-3 py-3 text-xs md:text-sm">
                        <div className="line-clamp-2">
                          {eleve.problematique || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.guide_nom} {eleve.guide_initiale}.
                      </td>                      
                      {/* Lecteur Interne */}
                      <td className="px-3 py-3">
                        <select
                          value={eleve.lecteur_interne_id || ''}
                          onChange={(e) => handleSelectUpdate(eleve.id, 'lecteur_interne_id', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        >
                          <option value="">-</option>
                          {guides.map(guide => (
                            <option key={guide.id} value={guide.id}>
                              {guide.nom} {guide.initiale}.
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {eleve.lecteur_interne_nom ? `${eleve.lecteur_interne_nom} ${eleve.lecteur_interne_initiale}.` : '-'}
                        </div>
                      </td>
                      
                      {/* Lecteur Externe */}
                      <td className="px-3 py-3">
                        <select
                          value={eleve.lecteur_externe_id || ''}
                          onChange={(e) => handleSelectUpdate(eleve.id, 'lecteur_externe_id', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        >
                          <option value="">-</option>
                          {lecteursExternes.map(lecteur => (
                            <option key={lecteur.id} value={lecteur.id}>
                              {lecteur.prenom} {lecteur.nom}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {eleve.lecteur_externe_prenom ? `${eleve.lecteur_externe_prenom} ${eleve.lecteur_externe_nom}` : '-'}
                        </div>
                      </td>
                      
                      {/* Médiateur */}
                      <td className="px-3 py-3">
                        <select
                          value={eleve.mediateur_id || ''}
                          onChange={(e) => handleSelectUpdate(eleve.id, 'mediateur_id', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          disabled={mediateurs.length === 0}
                        >
                          <option value="">-</option>
                          {mediateurs.map(mediateur => (
                            <option key={mediateur.id} value={mediateur.id}>
                              {mediateur.prenom} {mediateur.nom}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {eleve.mediateur_prenom ? `${eleve.mediateur_prenom} ${eleve.mediateur_nom}` : '-'}
                        </div>
                        {mediateurs.length === 0 && (
                          <div className="text-xs text-red-500 mt-1">
                            Table médiateurs non configurée
                          </div>
                        )}
                      </td>
                      
                      {/* Date de défense */}
                      <td className="px-3 py-3">
                        <input
                          type="date"
                          value={formatDateForInput(eleve.date_defense)}
                          onChange={(e) => handleUpdate(eleve.id, 'date_defense', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        />
                        {eleve.date_defense && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(eleve.date_defense).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      
                      {/* Heure de défense */}
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          value={eleve.heure_defense || ''}
                          onChange={(e) => handleUpdate(eleve.id, 'heure_defense', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {eleve.heure_defense || '-'}
                        </div>
                      </td>
                      
                      {/* Localisation */}
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={eleve.localisation_defense || ''}
                          onChange={(e) => handleUpdate(eleve.id, 'localisation_defense', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          placeholder="Salle, bâtiment..."
                        />
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {eleve.localisation_defense || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Note pour les utilisateurs mobiles */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 md:hidden">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <span className="text-lg">💡</span>
            Sur mobile, faites défiler horizontalement pour voir toutes les colonnes.
            Pour une meilleure expérience, pivotez votre appareil en mode paysage.
          </p>
        </div>
      </div>
    </div>
  );
}

