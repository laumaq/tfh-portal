// app/dashboard/guide/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '@/app/dashboard/coordinateur/utils/sessionUtils';
import { getConvocationColor, getConvocationLabelShort } from '@/app/dashboard/coordinateur/utils/convocationUtils';

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

type TabType = 'guide' | 'lecteur-interne' | 'defenses';

export default function GuideDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [defensesProgrammees, setDefensesProgrammees] = useState<Eleve[]>([]);
  const [defensesNonProgrammees, setDefensesNonProgrammees] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDefenses, setLoadingDefenses] = useState(false);
  const [userName, setUserName] = useState('');
  const [userGuideId, setUserGuideId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('guide');
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [categories, setCategories] = useState<string[]>([]);
  const [lecteurInterneEnabled, setLecteurInterneEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [objectifGeneral, setObjectifGeneral] = useState<string>('');
  // Modal d'objectif
  const [showObjectifModal, setShowObjectifModal] = useState(false);
  const [selectedEleveForObjectif, setSelectedEleveForObjectif] = useState<Eleve | null>(null);
  const [objectifParticulier, setObjectifParticulier] = useState('');
  const [savingObjectif, setSavingObjectif] = useState(false);
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
        
        // Prendre TOUTES les sessions détectées
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
      
      // Charger les guides (pour le dropdown des lecteurs internes)
      const { data: guidesData } = await supabase
        .from('guides')
        .select('id, nom, initiale');
      setGuides(guidesData || []);

      // Charger les lecteurs externes et médiateurs pour l'affichage des défenses
      const { data: lecteursExternesData } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom');
      setLecteursExternes(lecteursExternesData || []);

      const { data: mediateursData } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom');
      setMediateurs(mediateursData || []);

      // Charger les élèves assignés à ce guide
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .eq('guide_id', guideId)
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

      // Formater les données des élèves
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

      // Pour l'onglet Lecteur interne: charger les élèves qui n'ont pas encore de lecteur interne
      // OU dont le lecteur interne est l'utilisateur actuel
      const { data: elevesDispoData, error: elevesDispoError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale)
        `)
        .or(`lecteur_interne_id.is.null,lecteur_interne_id.eq.${guideId}`)
        .neq('guide_id', guideId)
        // Filtrer les élèves qui ont une catégorie
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

      // Extraire les catégories uniques pour le filtre
      const uniqueCategories = Array.from(
        new Set(elevesDispoFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      // Pré-sélectionner les élèves où l'utilisateur est déjà lecteur interne
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
      // Charger le paramètre d'activation de l'onglet
      const { data: enabledData, error: enabledError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'guide_lecteur_interne_enabled')
        .single();
      
      if (!enabledError && enabledData) {
        setLecteurInterneEnabled(enabledData.setting_value === 'true');
      }
  
      // Charger l'objectif général
      const { data: objectifData, error: objectifError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .single();
      
      if (!objectifError && objectifData) {
        setObjectifGeneral(objectifData.setting_value || '');
      }
  
      // Charger les paramètres d'affichage pour les guides
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
  
  const calculateColspan = (isProgrammed: boolean) => {
    let count = 0;
    
    // Colonnes toujours visibles
    count += 1; // Checkbox
    count += 2; // date heure

    
    // Colonnes conditionnelles
    if (displaySettings.lecteur_interne_voir_eleves) {
      count += isProgrammed ? 2 : 2; // Classe + Élève (2 colonnes)
    }
    
    count += 2; // Catégorie + Problématique (toujours visibles)
    
    if (displaySettings.lecteur_interne_voir_guides) count += 1;
    if (displaySettings.lecteur_interne_voir_lecteurs_externes) count += 1;
    if (displaySettings.lecteur_interne_voir_mediateurs) count += 1;
    
    return count;
  };

  const loadDefenses = async (guideId: string) => {
    try {
      setLoadingDefenses(true);
      
      // Charger tous les élèves où l'utilisateur est soit guide, soit lecteur interne
      const { data: defensesData, error: defensesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
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

      // Séparer les défenses programmées et non programmées
      const programmees = defensesFormatted.filter(eleve => 
        eleve.date_defense && eleve.heure_defense
      );
      
      const nonProgrammees = defensesFormatted.filter(eleve => 
        !eleve.date_defense || !eleve.heure_defense
      );

      setDefensesProgrammees(programmees);
      setDefensesNonProgrammees(nonProgrammees);

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

  const handleSaveLecteurInterne = async () => {
    try {
      // D'abord, retirer ce guide comme lecteur interne de tous les élèves
      const { error: clearError } = await supabase
        .from('eleves')
        .update({ lecteur_interne_id: null })
        .eq('lecteur_interne_id', userGuideId);

      if (clearError) throw clearError;

      // Ensuite, ajouter ce guide comme lecteur interne aux élèves sélectionnés
      if (selectedEleves.length > 0) {
        const { error: updateError } = await supabase
          .from('eleves')
          .update({ lecteur_interne_id: userGuideId })
          .in('id', selectedEleves);

        if (updateError) throw updateError;
      }

      // Recharger les données
      await loadData(userGuideId);
      
      alert('Modifications enregistrées avec succès !');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Fonction ORIGINALE pour la problématique (ne pas modifier)
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

  // NOUVELLE fonction pour les sessions
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
  
  // Ouvrir le modal d'objectif
  const openObjectifModal = (eleve: Eleve) => {
    setSelectedEleveForObjectif(eleve);
    setObjectifParticulier(eleve.objectif_particulier || '');
    setShowObjectifModal(true);
  };
  
  // Sauvegarder l'objectif
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
  
      // Mettre à jour l'état local
      const updatedEleves = eleves.map(eleve => 
        eleve.id === selectedEleveForObjectif.id 
          ? { ...eleve, objectif_particulier: objectifParticulier.trim() || null }
          : eleve
      );
      setEleves(updatedEleves);
  
      // Fermer le modal
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
  
  // Fermer le modal
  const closeObjectifModal = () => {
    setShowObjectifModal(false);
    setSelectedEleveForObjectif(null);
    setObjectifParticulier('');
  };

  // Fonction pour obtenir le label court
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

  if (loading && activeTab === 'guide') {
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Guide</h1>
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
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'guide'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Guide ({eleves.length} élève(s))
          </button>
          
          {/* Afficher l'onglet seulement si autorisé */}
          {settingsLoaded && lecteurInterneEnabled && (
            <button
              onClick={() => setActiveTab('lecteur-interne')}
              className={`px-4 py-2 font-medium text-sm md:text-base ${
                activeTab === 'lecteur-interne'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lecteur interne
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
            Défenses programmées
          </button>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'guide' ? (
          <>
            {/* Objectif général (uniquement dans l'onglet Guide) */}
            {objectifGeneral ? (
              <div className="bg-white rounded-lg shadow p-6 mb-6 border border-blue-200">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Objectifs actuels des élèves et échéances
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Tenez compte de ces objectifs afin de déterminer si vous devez ou non convoquer vos élèves 
                    à venir travailler à la prochaine session de journées TFH.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-bold">!</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">
                        {objectifGeneral}
                      </p>
                      <div className="mt-2 pt-2 border-t border-blue-100">
                        <p className="text-xs text-blue-600">
                          Objectif général défini par l'administration - visible par tous les guides
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Objectifs actuels des élèves
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Aucun objectif général n'a été défini par l'administration pour le moment.
                  </p>
                </div>
                
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Les objectifs généraux peuvent être définis dans les paramètres du système par les coordinateurs.
                  </p>
                </div>
              </div>
            )}

            {/* Légende des couleurs - DÉPLACÉE APRÈS l'objectif général */}
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


            {/* Tableau des élèves assignés */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Objectif particulier</th>
                    {/* En-têtes dynamiques des sessions */}
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
                          <textarea
                            defaultValue={eleve.problematique}
                            onBlur={(e) => handleUpdateProblematique(eleve.id, e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start whitespace-pre-wrap break-words"
                          >
                            {eleve.problematique || '-'}
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
                            title={eleve.objectif_particulier || "Cliquer pour définir un objectif"}
                          >
                            <span className={`text-lg ${eleve.objectif_particulier ? 'text-green-600' : 'text-gray-400'}`}>
                              🎯
                            </span>
                            <span className="text-xs">
                              {eleve.objectif_particulier 
                                ? (eleve.objectif_particulier.length > 20 
                                    ? eleve.objectif_particulier.substring(0, 20) + '...' 
                                    : eleve.objectif_particulier)
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
                      
                      {/* Toutes les sessions détectées */}
                      {sessions.map(session => {
                        const columnName = `session_${session.index}_convoque`;
                        const valeur = (eleve as any)[columnName] as string | undefined;
                        const statut = valeur || '';
                        
                        return (
                          <td key={session.index} className="px-4 py-3">
                            <div className="space-y-1">
                              <select
                                value={statut}
                                onChange={(e) => handleUpdateSessionConvocation(eleve.id, session.index, e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(statut)}`}
                                title={statut || 'Non défini'}
                              >
                                {CONVOCATION_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} className={opt.color}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <div className={`text-xs px-2 py-1 rounded truncate ${getConvocationColor(statut)}`}>
                                {getConvocationLabelShort(statut)}
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
        ) : activeTab === 'lecteur-interne' ? (
          <div className="space-y-6">
            {/* Indicateur d'état */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-purple-800">
                    Mode sélection lecteur interne
                  </h3>
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

            {/* En-tête avec filtres et bouton de sauvegarde */}
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
                      onClick={handleSaveLecteurInterne}
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
                          {eleve.date_defense 
                            ? new Date(eleve.date_defense).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : 'Non définie'}
                        </td>
                        
                        <td className="px-4 py-3 text-sm">
                          {eleve.heure_defense 
                            ? eleve.heure_defense.substring(0, 5) // Format "HH:MM"
                            : 'Non définie'}
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
        ) : (
          /* Onglet Défenses programmées */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800">Défenses programmées</h2>
              <p className="text-gray-600 mt-1">
                Liste de tous vos élèves (en tant que guide ou lecteur interne).
              </p>
            </div>

            {loadingDefenses ? (
              <div className="text-center py-12">
                <div className="text-xl">Chargement des données...</div>
              </div>
            ) : defensesProgrammees.length === 0 && defensesNonProgrammees.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun élève trouvé</h3>
                <p className="text-gray-500">
                  Vous n'avez pas d'élèves assignés (en tant que guide ou lecteur interne).
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Section des défenses programmées */}
                {defensesProgrammees.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Défenses programmées ({defensesProgrammees.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Défenses avec date, heure et localisation définies.
                      </p>
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
                            
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                            )}
                            
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                            )}
                            
                            {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>
                            )}
                            
                            {displaySettings.lecteur_interne_voir_mediateurs && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                            )}
                            
                          </tr>
                        </thead>
                        <tbody>
                          {defensesProgrammees.map((eleve) => {
                            const isGuide = eleve.guide_id === userGuideId;
                            const isLecteurInterne = eleve.lecteur_interne_id === userGuideId;
                            
                            return (
                              <tr key={eleve.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                  {formatDate(eleve.date_defense)}
                                </td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                  {eleve.heure_defense || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {eleve.localisation_defense || '-'}
                                </td>

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
                                    {eleve.problematique || '-'}
                                  </div>
                                </td>
                        
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.guide_nom} {eleve.guide_initiale}.
                                    {isGuide && (
                                      <span className="ml-1 text-xs text-blue-600">(vous)</span>
                                    )}
                                  </td>
                                )}
                        
                                {displaySettings.lecteur_interne_voir_guides && ( 
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_interne_nom ? (
                                      <span>
                                        {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}
                                        {isLecteurInterne && (
                                          <span className="ml-1 text-xs text-blue-600">(vous)</span>
                                        )}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                )}
                        
                                {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_externe_nom ? (
                                      <span>
                                        {eleve.lecteur_externe_prenom} {eleve.lecteur_externe_nom}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                )}
                        
                                {displaySettings.lecteur_interne_voir_mediateurs && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.mediateur_nom ? (
                                      <span>
                                        {eleve.mediateur_prenom} {eleve.mediateur_nom}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
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

                {/* Section des défenses non programmées */}
                {defensesNonProgrammees.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                        Défenses non programmées ({defensesNonProgrammees.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Défenses en attente de programmation.
                      </p>
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
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                            )}
                            {displaySettings.lecteur_interne_voir_guides && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                            )}
                            {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur externe</th>
                            )}
                            {displaySettings.lecteur_interne_voir_mediateurs && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                            )}
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
                                    {eleve.problematique || '-'}
                                  </div>
                                </td>
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.guide_nom} {eleve.guide_initiale}.
                                    {isGuide && (
                                      <span className="ml-1 text-xs text-blue-600">(vous)</span>
                                    )}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_guides && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_interne_nom ? (
                                      <span>
                                        {eleve.lecteur_interne_nom} {eleve.lecteur_interne_initiale}.
                                        {isLecteurInterne && (
                                          <span className="ml-1 text-xs text-blue-600">(vous)</span>
                                        )}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_lecteurs_externes && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.lecteur_externe_nom ? (
                                      <span>
                                        {eleve.lecteur_externe_prenom} {eleve.lecteur_externe_nom}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                )}
                                {displaySettings.lecteur_interne_voir_mediateurs && (
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {eleve.mediateur_nom ? (
                                      <span>
                                        {eleve.mediateur_prenom} {eleve.mediateur_nom}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
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
              </div>
            )}
          </div>
        )}

        {/* Note informative */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              {activeTab === 'guide' && 'Vous pouvez modifier la problématique en cliquant dessus, et les convocations via les menus déroulants.'}
              {activeTab === 'lecteur-interne' && 'Sélectionnez les élèves pour lesquels vous serez lecteur interne. Un élève ne peut avoir qu\'un seul lecteur interne.'}
              {activeTab === 'defenses' && 'Affichage séparé des défenses programmées et non programmées.'}
            </span>
          </p>
        </div>
      </div>

      {/* Modal d'objectif particulier */}
      {showObjectifModal && selectedEleveForObjectif && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* En-tête */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    🎯 Objectif particulier
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEleveForObjectif.prenom} {selectedEleveForObjectif.nom} - {selectedEleveForObjectif.classe}
                  </p>
                </div>
                <button
                  onClick={closeObjectifModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
      
            {/* Contenu */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objectif spécifique pour cet élève :
                </label>
                <textarea
                  value={objectifParticulier}
                  onChange={(e) => setObjectifParticulier(e.target.value)}
                  className="w-full h-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Définir un objectif pédagogique spécifique pour cet élève..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Cet objectif n'est visible que par vous (guide) et l'administration.
                </p>
              </div>
      
              {selectedEleveForObjectif.problematique && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Problématique de l'élève :</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedEleveForObjectif.problematique}
                  </p>
                </div>
              )}
            </div>
      
            {/* Pied de page */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeObjectifModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  disabled={savingObjectif}
                >
                  Annuler
                </button>
                <button
                  onClick={saveObjectifParticulier}
                  disabled={savingObjectif}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    !savingObjectif
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-400 text-white cursor-not-allowed'
                  }`}
                >
                  {savingObjectif ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    'Sauvegarder l\'objectif'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








