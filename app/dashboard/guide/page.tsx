// /app/dashboard/guide/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '@/app/dashboard/coordinateur/utils/sessionUtils';
import { getConvocationColor, getConvocationLabelShort } from '@/app/dashboard/coordinateur/utils/convocationUtils';
import ProfileSettings from './components/ProfileSettings';
import { 
  getJourneesFromSupabase, 
  detecterSessions, 
  estConvoque, 
  getPresenceJournee, 
  getStatutSession 
} from '@/app/dashboard/coordinateur/utils/sessionUtils';

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
  objectif_particulier: string | null;
  url_tfh?: string;
  tfh_non_rendu?: boolean;
}

interface Guide {
  id: string;
  nom: string;
  prenom: string; 
  initiale: string;
  telephone?: string;
  accepte_numerique?: boolean;
}

type TabType = 'suivi' | 'lecteur-interne' | 'defenses' | 'parametres';

export default function GuideDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [defensesProgrammees, setDefensesProgrammees] = useState<Eleve[]>([]);
  const [defensesNonProgrammees, setDefensesNonProgrammees] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDefenses, setLoadingDefenses] = useState(false);
  const [userName, setUserName] = useState('');
  const [userGuideId, setUserGuideId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('suivi');
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [categories, setCategories] = useState<string[]>([]);
  const [lecteurInterneEnabled, setLecteurInterneEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [objectifGeneral, setObjectifGeneral] = useState<string>('');
  const [defensesNonRendus, setDefensesNonRendus] = useState<Eleve[]>([]);
  const [showObjectifModal, setShowObjectifModal] = useState(false);
  const [selectedEleveForObjectif, setSelectedEleveForObjectif] = useState<Eleve | null>(null);
  const [objectifParticulier, setObjectifParticulier] = useState('');
  const [savingObjectif, setSavingObjectif] = useState(false);
  const [presences, setPresences] = useState<Record<string, Record<number, boolean | null>>>({});
  const [sessionsData, setSessionsData] = useState<Session[]>([]);
  const [displaySettings, setDisplaySettings] = useState({
    lecteur_interne_voir_eleves: true,
    lecteur_interne_voir_guides: true,
    lecteur_interne_voir_lecteurs_externes: true,
    lecteur_interne_voir_mediateurs: true,
  });
  
  const [sessions, setSessions] = useState<Array<{
    index: number;
    nom: string;
  }>>([]);
  
  const router = useRouter();

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
      value: 'Oui, l\'élève n\'a pas avancé', 
      label: 'Oui, l\'élève n\'a pas avancé',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    { 
      value: 'Oui, l\'élève n\'a pas communiqué', 
      label: 'Oui, l\'élève n\'a pas communiqué',
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
    loadSystemSettings();
  }, [router]);

  useEffect(() => {
    const chargerSessions = async () => {
      try {
        const journeesData = await getJourneesFromSupabase(supabase);
        const sessionsDetectees = detecterSessions(journeesData);
        
        // Stocker les sessions complètes avec leurs journées
        setSessionsData(sessionsDetectees);
        
        // Garder aussi le format simplifié pour les en-têtes
        const toutesSessions = sessionsDetectees.map(session => {
          const match = session.id.match(/session_(\d+)/);
          const index = match ? parseInt(match[1]) : 0;
          return {
            index: index,
            nom: session.nom
          };
        });
        
        setSessions(toutesSessions);
        
      } catch (error) {
        console.error('Erreur chargement des sessions:', error);
      }
    };
    
    chargerSessions();
  }, []);

  const loadData = async (guideId: string) => {
    try {
      setLoading(true);
      
      const { data: guidesData } = await supabase
        .from('guides')
        .select('id, nom, prenom, initiale');
      setGuides(guidesData || []);

      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:externes!lecteur_externe_id (nom, prenom),
          mediateur:externes!mediateur_id (nom, prenom)
        `)
        .eq('guide_id', guideId)
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

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

      const { data: elevesDispoData, error: elevesDispoError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale)
        `)
        .or(`lecteur_interne_id.is.null,lecteur_interne_id.eq.${guideId}`)
        .neq('guide_id', guideId)
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

      const uniqueCategories = Array.from(
        new Set(elevesDispoFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

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

  const loadSystemSettings = async () => {
    try {
      const { data: enabledData, error: enabledError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'guide_lecteur_interne_enabled')
        .single();
      
      if (!enabledError && enabledData) {
        setLecteurInterneEnabled(enabledData.setting_value === 'true');
      }
  
      const { data: objectifData, error: objectifError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .single();
      
      if (!objectifError && objectifData) {
        setObjectifGeneral(objectifData.setting_value || '');
      }
  
      const { data: displayData, error: displayError } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'lecteur_interne_voir_eleves',
            'lecteur_interne_voir_guides',
            'lecteur_interne_voir_lecteurs_externes',
            'lecteur_interne_voir_mediateurs'
          ]);
    
        if (!displayError && displayData) {
          const settings: any = {};
          displayData.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value === 'true';
          });
          setDisplaySettings(prev => ({ ...prev, ...settings }));
        }
      } catch (err) {
        console.error('Erreur chargement paramètres:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };

  const getSessionStatusDisplay = (statut: string) => {
    switch (statut) {
      case 'present':
        return {
          text: '✓ Présent',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          icon: '✓'
        };
      case 'absent':
        return {
          text: '✗ Absent',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          icon: '✗'
        };
      case 'partiellement-present':
        return {
          text: '⚠️ Partiel',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          icon: '⚠️'
        };
      case 'en-attente':
        return {
          text: '? En attente',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-500',
          icon: '?'
        };
      default:
        return {
          text: 'Non convoqué',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-400',
          icon: '-'
        };
    }
  };
  
  const calculateColspan = (isProgrammed: boolean) => {
    let count = 0;
    count += 1;
    count += 2;
    if (displaySettings.lecteur_interne_voir_eleves) {
      count += isProgrammed ? 2 : 2;
    }
    count += 2;
    if (displaySettings.lecteur_interne_voir_guides) count += 1;
    if (displaySettings.lecteur_interne_voir_lecteurs_externes) count += 1;
    if (displaySettings.lecteur_interne_voir_mediateurs) count += 1;
    return count;
  };

  const calculateColspanNonRendu = () => {
    let count = 0;
    if (displaySettings.lecteur_interne_voir_eleves) count += 2;
    count += 1;
    count += 1;
    if (displaySettings.lecteur_interne_voir_guides) count += 1;
    if (displaySettings.lecteur_interne_voir_guides) count += 1;
    if (displaySettings.lecteur_interne_voir_lecteurs_externes) count += 1;
    if (displaySettings.lecteur_interne_voir_mediateurs) count += 1;
    return count;
  };  

  const loadDefenses = async (guideId: string) => {
    try {
      setLoadingDefenses(true);
      
      const { data: defensesData, error: defensesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:externes!lecteur_externe_id (nom, prenom),
          mediateur:externes!mediateur_id (nom, prenom)
        `)
        .or(`guide_id.eq.${guideId},lecteur_interne_id.eq.${guideId}`)
        .order('date_defense', { ascending: true, nullsFirst: false })
        .order('heure_defense', { ascending: true, nullsFirst: false })
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

      const nonRendus = defensesFormatted.filter(eleve => eleve.tfh_non_rendu === true);
      const programmees = defensesFormatted.filter(eleve => 
        eleve.tfh_non_rendu !== true && eleve.date_defense && eleve.heure_defense
      );
      const nonProgrammees = defensesFormatted.filter(eleve => 
        eleve.tfh_non_rendu !== true && (!eleve.date_defense || !eleve.heure_defense)
      );

      setDefensesProgrammees(programmees);
      setDefensesNonProgrammees(nonProgrammees);
      setDefensesNonRendus(nonRendus);

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

  const filteredElevesDisponibles = elevesDisponibles.filter(eleve => {
    if (selectedCategorie === 'toutes') return true;
    return eleve.categorie === selectedCategorie;
  });

  // Ajoute cette fonction après loadDefenses (vers ligne 250)
  const loadPresences = async (eleveId: string) => {
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('journee_1_present, journee_2_present, journee_3_present, journee_4_present, journee_5_present, journee_6_present, journee_7_present, journee_8_present, journee_9_present, journee_10_present')
        .eq('id', eleveId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erreur chargement présences:', err);
      return null;
    }
  };  

  // Ajoute ce useEffect après le chargement des élèves (vers ligne 200)
  useEffect(() => {
    const loadAllPresences = async () => {
      if (eleves.length === 0) return;
      
      const presencesMap: Record<string, Record<number, boolean | null>> = {};
      for (const eleve of eleves) {
        const pres = await loadPresences(eleve.id);
        if (pres) {
          presencesMap[eleve.id] = pres;
        }
      }
      setPresences(presencesMap);
    };
    
    loadAllPresences();
  }, [eleves]);  

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
      const { error: clearError } = await supabase
        .from('eleves')
        .update({ lecteur_interne_id: null })
        .eq('lecteur_interne_id', userGuideId);

      if (clearError) throw clearError;

      if (selectedEleves.length > 0) {
        const { error: updateError } = await supabase
          .from('eleves')
          .update({ lecteur_interne_id: userGuideId })
          .in('id', selectedEleves);

        if (updateError) throw updateError;
      }

      await loadData(userGuideId);
      alert('Modifications enregistrées avec succès !');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleUpdateProblematique = async (eleveId: string, value: string) => {
    try {
      const { error } = await supabase
        .from('eleves')
        .update({ problematique: value })
        .eq('id', eleveId);
  
      if (error) throw error;
  
      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, problematique: value } : eleve
      ));
      
    } catch (err) {
      console.error('Erreur mise à jour problématique:', err);
      loadData(userGuideId);
    }
  };

  const handleUpdateSessionConvocation = async (eleveId: string, sessionIndex: number, value: string) => {
    try {
      const columnName = `session_${sessionIndex}_convoque`;
      const updateData: any = {};
      updateData[columnName] = value;
  
      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);
  
      if (error) throw error;
  
      setEleves(prev => prev.map(eleve => {
        if (eleve.id === eleveId) {
          return { 
            ...eleve, 
            [columnName]: value
          };
        }
        return eleve;
      }));
      
    } catch (err) {
      console.error('Erreur mise à jour convocation:', err);
      loadData(userGuideId);
    }
  };
  
  const openObjectifModal = (eleve: Eleve) => {
    setSelectedEleveForObjectif(eleve);
    setObjectifParticulier(eleve.objectif_particulier || '');
    setShowObjectifModal(true);
  };
  
  const saveObjectifParticulier = async () => {
    if (!selectedEleveForObjectif) return;
  
    setSavingObjectif(true);
    try {
      const { error } = await supabase
        .from('eleves')
        .update({ 
          objectif_particulier: objectifParticulier.trim() || null 
        })
        .eq('id', selectedEleveForObjectif.id);
  
      if (error) throw error;
  
      const updatedEleves = eleves.map(eleve => 
        eleve.id === selectedEleveForObjectif.id 
          ? { ...eleve, objectif_particulier: objectifParticulier.trim() || null }
          : eleve
      );
      setEleves(updatedEleves);
  
      setShowObjectifModal(false);
      setSelectedEleveForObjectif(null);
      alert('Objectif sauvegardé avec succès !');
      
    } catch (err) {
      console.error('Erreur sauvegarde objectif:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSavingObjectif(false);
    }
  };
  
  const closeObjectifModal = () => {
    setShowObjectifModal(false);
    setSelectedEleveForObjectif(null);
    setObjectifParticulier('');
  };

  const getShortLabel = (value: string) => {
    return getConvocationLabelShort(value);
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

  if (loading && activeTab === 'suivi') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement de vos élèves...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">TFH : Page de suivi des encadrants internes</h1>
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
        <div className="flex border-b border-gray-200 mb-6 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('suivi')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'suivi'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Suivi des élèves ({eleves.length})
          </button>
          
          {settingsLoaded && lecteurInterneEnabled && (
            <button
              onClick={() => setActiveTab('lecteur-interne')}
              className={`px-4 py-2 font-medium text-sm md:text-base ${
                activeTab === 'lecteur-interne'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👥 Lecteur interne
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('defenses')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'defenses'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Défenses programmées
          </button>
          
          <button
            onClick={() => setActiveTab('parametres')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'parametres'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚙️ Paramètres
          </button>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'parametres' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>⚙️</span>
                Paramètres personnels
              </h2>
              <p className="text-gray-600 mb-6">
                Gérez vos informations personnelles et vos préférences.
              </p>
              <ProfileSettings guideId={userGuideId} onRefresh={() => loadData(userGuideId)} />
            </div>
          </div>
        )}

        {activeTab === 'suivi' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-blue-200 h-full">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <span className="text-xl">🎯</span>
                    Objectifs et échéances
                  </h2>
                  {objectifGeneral ? (
                    <>
                      <p className="text-sm text-gray-600 mb-3">
                        Tenez compte de ces objectifs pour décider des convocations à la prochaine session TFH.
                      </p>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-xs font-bold">!</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{objectifGeneral}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-3">Aucun objectif général n'a été défini pour le moment.</p>
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">Les objectifs généraux seront définis par les coordinateurs.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-gray-200 h-full">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <span className="text-xl">📋</span>
                  Légende des convocations
                </h2>
                <div className="space-y-3">
                  {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
                    <div key={opt.value} className={`${opt.color} px-3 py-2 rounded-lg`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-3 h-3 rounded-full" style={{
                            backgroundColor: opt.color.includes('green') ? '#10B981' :
                                           opt.color.includes('yellow') ? '#F59E0B' :
                                           opt.color.includes('orange') ? '#F97316' :
                                           opt.color.includes('red') ? '#EF4444' : '#6B7280'
                          }}></div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs opacity-75 mt-0.5">
                            {opt.value === 'Non, l\'élève atteint bien les objectifs' && '✓ L\'élève a bien travaillé → Pas de convocation'}
                            {opt.value === 'Oui, l\'élève n\'atteint pas les objectifs' && '⚠️ L\'élève a avancé mais n\'atteint pas les objectifs → Convocation'}
                            {opt.value === 'Oui, l\'élève n\'a pas avancé' && '🔴 L\'élève n\'a pas avancé (ou très peu) → Convocation urgente'}
                            {opt.value === 'Oui, l\'élève n\'a pas communiqué' && '📢 L\'élève n\'a pas communiqué → Convocation pour échange'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 italic">
                    La convocation est une invitation à un entretien avec l'élève pour faire le point sur son avancement.
                  </p>
                </div>
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Objectif particulier</th>
                    {sessions.map(session => (
                      <th key={session.index} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {session.nom}
                      </th>
                    ))}
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
                          <div className="space-y-2">
                            <textarea
                              defaultValue={eleve.problematique}
                              className="w-full border rounded px-2 py-1 text-sm"
                              rows={3}
                              autoFocus
                              id={`textarea-${eleve.id}`}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={async () => {
                                  const textarea = document.getElementById(`textarea-${eleve.id}`) as HTMLTextAreaElement;
                                  await handleUpdateProblematique(eleve.id, textarea.value);
                                  setEditingCell(null);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                ✓ Sauvegarder
                              </button>
                              <button
                                onClick={() => setEditingCell(null)}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                ✗ Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 whitespace-pre-wrap break-words">{eleve.problematique || '-'}</div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                                className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                title="Modifier la problématique"
                              >
                                ✏️
                              </button>
                              {eleve.url_tfh && (
                                <a
                                  href={eleve.url_tfh}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                  title="Ouvrir le lien vers le TFH numérique"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🔗
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1">
                          <button
                            onClick={() => openObjectifModal(eleve)}
                            className={`flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              eleve.objectif_particulier
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <span className={`text-lg ${eleve.objectif_particulier ? 'text-green-600' : 'text-gray-400'}`}>🎯</span>
                            <span className="text-xs">
                              {eleve.objectif_particulier 
                                ? eleve.objectif_particulier.length > 20 
                                  ? eleve.objectif_particulier.substring(0, 20) + '...' 
                                  : eleve.objectif_particulier
                                : 'Définir'}
                            </span>
                          </button>
                          {eleve.objectif_particulier && (
                            <div className="text-xs text-gray-500 text-center">
                              {eleve.objectif_particulier.length > 100 
                                ? `${Math.ceil(eleve.objectif_particulier.length / 100)} paragraphe(s)` 
                                : 'Objectif défini'}
                            </div>
                          )}
                        </div>
                      </td>
                      {sessionsData.map((session) => {
                        const sessionNum = parseInt(session.id.split('_')[1]);
                        const columnName = `session_${sessionNum}_convoque`;
                        const valeur = (eleve as any)[columnName] as string | undefined;
                        const estConvoqueFlag = valeur?.startsWith('Oui') === true;
                        
                        // Obtenir le statut de présence pour cette session
                        const statutSession = getStatutSession(eleve as any, session);
                        const statusDisplay = getSessionStatusDisplay(statutSession);
                        
                        // Si l'élève n'est pas convoqué, ne pas afficher les présences
                        if (!estConvoqueFlag) {
                          return (
                            <td key={session.id} className="px-4 py-3">
                              <div className="space-y-2">
                                <select
                                  value={valeur || ''}
                                  onChange={(e) => handleUpdateSessionConvocation(eleve.id, sessionNum, e.target.value)}
                                  className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(valeur || '')}`}
                                >
                                  {CONVOCATION_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} className={opt.color}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="text-xs text-gray-400 italic text-center">
                                  Non convoqué
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        // Afficher les présences pour chaque journée de la session
                        return (
                          <td key={session.id} className="px-4 py-3">
                            <div className="space-y-2">
                              {/* Sélecteur de convocation */}
                              <select
                                value={valeur || ''}
                                onChange={(e) => handleUpdateSessionConvocation(eleve.id, sessionNum, e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(valeur || '')}`}
                              >
                                {CONVOCATION_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} className={opt.color}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              
                              {/* Statut global de la session */}
                              <div className={`text-center text-xs font-medium py-1 rounded ${statusDisplay.bgColor} ${statusDisplay.textColor}`}>
                                {statusDisplay.text}
                              </div>
                              
                              {/* Détail des présences par journée */}
                              <div className="flex flex-wrap gap-1 justify-center">
                                {session.journees.map((journeeKey, idx) => {
                                  const journeeNum = parseInt(journeeKey.split('_')[1]);
                                  const presence = getPresenceJournee(eleve as any, journeeNum);
                                  const presenceDisplay = presence === true ? '✓' : presence === false ? '✗' : '?';
                                  const presenceBg = presence === true ? 'bg-green-100 text-green-700' : 
                                                     presence === false ? 'bg-red-100 text-red-700' : 
                                                     'bg-gray-100 text-gray-500';
                                  
                                  return (
                                    <div 
                                      key={journeeKey} 
                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${presenceBg}`}
                                      title={`Journée ${idx + 1}`}
                                    >
                                      {presenceDisplay}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'lecteur-interne' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-purple-800">Mode sélection lecteur interne</h3>
                  <p className="text-sm text-purple-600 mt-1">
                    Sélectionnez les élèves pour lesquels vous serez lecteur interne.
                    Cet onglet est activé par l'administration.
                  </p>
                </div>
                <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {selectedEleves.length} sélectionné(s)
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">Sélection des élèves comme lecteur interne</h2>
                  <p className="text-gray-600 mt-1">
                    Sélectionnez les élèves pour lesquels vous serez lecteur interne.
                    Les élèves sélectionnés n'apparaîtront plus dans la liste des autres guides.
                    N'oubliez pas d'enregistrer si vous cochez des élèves dans la liste.
                  </p>
                </div>
                <div className="flex flex-col md:items-end gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filtrer par catégorie:</label>
                    <select
                      value={selectedCategorie}
                      onChange={(e) => setSelectedCategorie(e.target.value)}
                      className="border rounded px-3 py-1 text-sm"
                    >
                      <option value="toutes">Toutes les catégories</option>
                      {categories.map(categorie => (
                        <option key={categorie} value={categorie}>{categorie}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 whitespace-nowrap">{selectedEleves.length} élève(s) sélectionné(s)</span>
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
                    {displaySettings.lecteur_interne_voir_eleves && (
                      <>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date défense</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure défense</th>
                    {displaySettings.lecteur_interne_voir_guides && ( 
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredElevesDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={calculateColspan(true)} className="px-4 py-8 text-center text-gray-500">
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
                        {displaySettings.lecteur_interne_voir_eleves && ( 
                          <>
                            <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-col">
                                <span className="font-medium">{eleve.nom}</span>
                                <span>{eleve.prenom}</span>
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-sm">
                          {eleve.categorie ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {eleve.categorie}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="max-w-xs whitespace-pre-wrap break-words min-h-[40px]">{eleve.problematique || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {eleve.date_defense 
                            ? new Date(eleve.date_defense).toLocaleDateString('fr-FR')
                            : 'Non définie'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {eleve.heure_defense ? eleve.heure_defense.substring(0, 5) : 'Non définie'}
                        </td>
                        {displaySettings.lecteur_interne_voir_guides && ( 
                          <td className="px-4 py-3 text-sm">
                            {eleve.guide_nom} {eleve.guide_initiale}.
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'defenses' && (
          <div className="space-y-6">
            {loadingDefenses ? (
              <div className="text-center py-12"><div className="text-xl">Chargement des données...</div></div>
            ) : defensesProgrammees.length === 0 && defensesNonProgrammees.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun élève trouvé</h3>
                <p className="text-gray-500">Vous n'avez pas d'élèves assignés (en tant que guide ou lecteur interne).</p>
              </div>
            ) : (
              <div className="space-y-8">
                {defensesProgrammees.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Défenses programmées ({defensesProgrammees.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Défenses avec date, heure et localisation définies.</p>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Localisation</th>
                            {displaySettings.lecteur_interne_voir_eleves && (
                              <>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Élève</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                              </>
                            )}                            
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-96">Problématique</th>
                            {displaySettings.lecteur_interne_voir_guides && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>}
                            {displaySettings.lecteur_interne_voir_guides && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>}
                            {displaySettings.lecteur_interne_voir_lecteurs_externes && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>}
                            {displaySettings.lecteur_interne_voir_mediateurs && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {defensesProgrammees.map((eleve) => {
                            const isGuide = eleve.guide_id === userGuideId;
                            const isLecteurInterne = eleve.lecteur_interne_id === userGuideId;
                            return (
                              <tr key={eleve.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{formatDate(eleve.date_defense)}</td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">{eleve.heure_defense || '-'}</td>
                                <td className="px-4 py-3 text-sm">{eleve.localisation_defense || '-'}</td>
                                {displaySettings.lecteur_interne_voir_eleves && (
                                  <>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{eleve.nom}</span>
                                        <span className="truncate">{eleve.prenom}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                                  </>
                                )}
                                <td className="px-4 py-3 text-sm">
                                  {eleve.categorie ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                      {eleve.categorie}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="whitespace-pre-wrap break-words min-h-[40px] max-w-96">
                                    {eleve.url_tfh ? (
                                      <a href={eleve.url_tfh} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {eleve.problematique || '-'}
                                      </a>
                                    ) : (eleve.problematique || '-')}
                                  </div>
                                </td>
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.guide_nom} {eleve.guide_initiale}.
                                    {isGuide && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_guides && ( 
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_interne_nom ? (
                                      <span>
                                        {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}
                                        {isLecteurInterne && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                      </span>
                                    ) : '-'}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_externe_nom ? `${eleve.lecteur_externe_prenom} ${eleve.lecteur_externe_nom}` : '-'}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_mediateurs && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.mediateur_nom ? `${eleve.mediateur_prenom} ${eleve.mediateur_nom}` : '-'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {defensesNonProgrammees.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                        Défenses non programmées ({defensesNonProgrammees.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Défenses en attente de programmation.</p>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            {displaySettings.lecteur_interne_voir_eleves && (
                              <>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Élève</th>
                              </>
                            )}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-96">Problématique</th>
                            {displaySettings.lecteur_interne_voir_guides && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>}
                            {displaySettings.lecteur_interne_voir_guides && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>}
                            {displaySettings.lecteur_interne_voir_lecteurs_externes && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>}
                            {displaySettings.lecteur_interne_voir_mediateurs && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {defensesNonProgrammees.map((eleve) => {
                            const isGuide = eleve.guide_id === userGuideId;
                            const isLecteurInterne = eleve.lecteur_interne_id === userGuideId;
                            return (
                              <tr key={eleve.id} className="border-b hover:bg-gray-50">
                                {displaySettings.lecteur_interne_voir_eleves && (
                                  <>
                                    <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{eleve.nom}</span>
                                        <span className="truncate">{eleve.prenom}</span>
                                      </div>
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-3 text-sm">
                                  {eleve.categorie ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                      {eleve.categorie}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="whitespace-pre-wrap break-words min-h-[40px] max-w-96">
                                    {eleve.url_tfh ? (
                                      <a href={eleve.url_tfh} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {eleve.problematique || '-'}
                                      </a>
                                    ) : (eleve.problematique || '-')}
                                  </div>
                                </td>
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.guide_nom} {eleve.guide_initiale}.
                                    {isGuide && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_interne_nom ? (
                                      <span>
                                        {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}.
                                        {isLecteurInterne && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                      </span>
                                    ) : '-'}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_externe_nom ? `${eleve.lecteur_externe_prenom} ${eleve.lecteur_externe_nom}` : '-'}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_mediateurs && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.mediateur_nom ? `${eleve.mediateur_prenom} ${eleve.mediateur_nom}` : '-'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {defensesNonRendus.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        TFH non rendus ({defensesNonRendus.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Ces élèves n’ont pas rendu leur travail. Leur soutenance n’aura pas lieu.</p>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            {displaySettings.lecteur_interne_voir_eleves && (
                              <>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Élève</th>
                              </>
                            )}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-96">Problématique</th>
                            {displaySettings.lecteur_interne_voir_guides && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>}
                            {displaySettings.lecteur_interne_voir_guides && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>}
                            {displaySettings.lecteur_interne_voir_lecteurs_externes && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>}
                            {displaySettings.lecteur_interne_voir_mediateurs && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {defensesNonRendus.map((eleve) => {
                            const isGuide = eleve.guide_id === userGuideId;
                            const isLecteurInterne = eleve.lecteur_interne_id === userGuideId;
                            return (
                              <React.Fragment key={eleve.id}>
                                <tr className="border-b bg-red-50">
                                  {displaySettings.lecteur_interne_voir_eleves && (
                                    <>
                                      <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                                      <td className="px-4 py-3 text-sm">
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium truncate">{eleve.nom}</span>
                                          <span className="truncate">{eleve.prenom}</span>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                  <td className="px-4 py-3 text-sm">
                                    {eleve.categorie ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                        {eleve.categorie}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="whitespace-pre-wrap break-words min-h-[40px] max-w-96">{eleve.problematique || '-'}</div>
                                  </td>
                                  {displaySettings.lecteur_interne_voir_guides && (
                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                      {eleve.guide_nom} {eleve.guide_initiale}.
                                      {isGuide && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                    </td>
                                  )}
                                  {displaySettings.lecteur_interne_voir_guides && (
                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                      {eleve.lecteur_interne_nom ? (
                                        <span>
                                          {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}.
                                          {isLecteurInterne && <span className="ml-1 text-xs text-blue-600">(vous)</span>}
                                        </span>
                                      ) : '-'}
                                    </td>
                                  )}
                                  {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                      {eleve.lecteur_externe_nom ? `${eleve.lecteur_externe_prenom} ${eleve.lecteur_externe_nom}` : '-'}
                                    </td>
                                  )}
                                  {displaySettings.lecteur_interne_voir_mediateurs && (
                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                      {eleve.mediateur_nom ? `${eleve.mediateur_prenom} ${eleve.mediateur_nom}` : '-'}
                                    </td>
                                  )}
                                </tr>
                                <tr className="bg-red-50 border-b">
                                  <td colSpan={calculateColspanNonRendu()} className="px-4 py-2 text-sm text-red-700 bg-red-100">
                                    ⚠️ L'élève n'a malheureusement pas rendu son TFH. Sa soutenance n'aura donc pas lieu.
                                    {!isGuide && isLecteurInterne && " S'il reste des TFH disponibles qui vous intéressent, n'hésitez pas à refaire un tour dans l'onglet 'Lecteur interne'."}
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Note informative */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              {activeTab === 'suivi' && 'Vous pouvez modifier la problématique en cliquant dessus (sauf si l’élève a déposé un lien, auquel cas il est cliquable vers sa version numérique). Les convocations se gèrent via les menus déroulants.'}
              {activeTab === 'lecteur-interne' && 'Sélectionnez les élèves pour lesquels vous serez lecteur interne. Un élève ne peut avoir qu\'un seul lecteur interne.'}
              {activeTab === 'defenses' && 'Les élèves en rouge n’ont pas rendu leur TFH → soutenance annulée. Les problématiques bleues sont cliquables pour accéder à la version digitale du TFH (si disponible).'}
              {activeTab === 'parametres' && 'Modifiez vos informations personnelles et vos préférences de format (papier ou numérique).'}
            </span>
          </p>
        </div>
      </div>

      {/* Modal d'objectif particulier */}
      {showObjectifModal && selectedEleveForObjectif && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">🎯 Objectif particulier</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEleveForObjectif.prenom} {selectedEleveForObjectif.nom} - {selectedEleveForObjectif.classe}
                  </p>
                </div>
                <button onClick={closeObjectifModal} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Objectif spécifique pour cet élève :</label>
                <textarea
                  value={objectifParticulier}
                  onChange={(e) => setObjectifParticulier(e.target.value)}
                  className="w-full h-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Définir un objectif pédagogique spécifique pour cet élève..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Cet objectif n'est visible que par vous (guide) et l'administration.</p>
              </div>
              {selectedEleveForObjectif.problematique && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Problématique de l'élève :</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedEleveForObjectif.problematique}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex justify-end gap-3">
                <button onClick={closeObjectifModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium" disabled={savingObjectif}>Annuler</button>
                <button onClick={saveObjectifParticulier} disabled={savingObjectif} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${!savingObjectif ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-400 text-white cursor-not-allowed'}`}>
                  {savingObjectif ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Sauvegarde...</> : 'Sauvegarder l\'objectif'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
