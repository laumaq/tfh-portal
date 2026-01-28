// app/dashboard/coordinateur/tabs/ParametresTab.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings, Eye, Calendar, ChevronRight, RefreshCw, 
  Save, Plus, Info, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle
} from 'lucide-react';
import ToggleSetting from '../components/ToggleSettings';

interface JourneeTFH {
  id: number;
  date: string;
  libelle: string;
}

interface DisplaySettings {
  lecteur_externe_voir_eleves: boolean;
  lecteur_externe_voir_guides: boolean;
  lecteur_externe_voir_lecteurs_internes: boolean;
  lecteur_externe_voir_mediateurs: boolean;
  lecteur_interne_voir_eleves: boolean;
  lecteur_interne_voir_guides: boolean;
  lecteur_interne_voir_lecteurs_externes: boolean;
  lecteur_interne_voir_mediateurs: boolean;
  mediateur_voir_eleves: boolean;
  mediateur_voir_guides: boolean;
  mediateur_voir_lecteurs_internes: boolean;
  mediateur_voir_lecteurs_externes: boolean;
}

export default function ParametresTab() {
  // État des sections dépliables
  const [expandedSections, setExpandedSections] = useState({
    fonctionnels: true,
    affichage: false,
    annee: false
  });

  // Paramètres fonctionnels
  const [lecteurInterneEnabled, setLecteurInterneEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{type: 'info' | 'error', text: string} | null>(null);
  
  // Paramètres d'affichage
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    lecteur_externe_voir_eleves: true,
    lecteur_externe_voir_guides: true,
    lecteur_externe_voir_lecteurs_internes: true,
    lecteur_externe_voir_mediateurs: true,
    lecteur_interne_voir_eleves: true,
    lecteur_interne_voir_guides: true,
    lecteur_interne_voir_lecteurs_externes: true,
    lecteur_interne_voir_mediateurs: true,
    mediateur_voir_eleves: true,
    mediateur_voir_guides: true,
    mediateur_voir_lecteurs_internes: true,
    mediateur_voir_lecteurs_externes: true,
  });

  // Paramètres de l'année TFH
  const [journeesTFH, setJourneesTFH] = useState<JourneeTFH[]>([]);
  const [loadingJournees, setLoadingJournees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasLoadedJournees, setHasLoadedJournees] = useState(false);

  // Messages temporaires
  const showMessage = (type: 'info' | 'error', text: string) => {
    setSettingsMessage({ type, text });
    setTimeout(() => setSettingsMessage(null), 3000);
  };

  // Charger les paramètres système
  const loadSystemSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      // Charger le paramètre fonctionnel
      const { data: functionalData } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'guide_lecteur_interne_enabled')
        .single();
      
      if (functionalData) {
        setLecteurInterneEnabled(functionalData.setting_value === 'true');
      }

      // Charger les paramètres d'affichage
      const { data: displayData } = await supabase
        .from('system_settings')
        .select('*');
      
      if (displayData) {
        const settings: any = {};
        displayData.forEach(setting => {
          settings[setting.setting_key] = setting.setting_value === 'true';
        });
        setDisplaySettings(prev => ({ ...prev, ...settings }));
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
      showMessage('error', 'Erreur lors du chargement des paramètres');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadJourneesTFH = useCallback(async () => {
    setLoadingJournees(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .like('setting_key', 'Journee_%')
        .order('setting_key');
      
      if (error) throw error;
      
      // Récupérer le nombre max depuis la base
      let maxId = 10;
      if (data && data.length > 0) {
        data.forEach(item => {
          const match = item.setting_key.match(/Journee_(\d+)/);
          if (match) {
            const id = parseInt(match[1]);
            if (id > maxId) maxId = id;
          }
        });
      }
      
      // S'il y a déjà des journées locales ET qu'on a déjà chargé une fois
      // on garde le max entre base et local
      const taille = hasLoadedJournees 
        ? Math.max(maxId, journeesTFH.length)
        : Math.max(maxId, 10);
      
      const journees = Array.from({ length: taille }, (_, i) => {
        const journeeId = i + 1;
        const journeeData = data?.find(d => d.setting_key === `Journee_${journeeId}`);
        
        // Si on a déjà chargé une fois, on garde les données locales existantes
        if (hasLoadedJournees) {
          const existingJournee = journeesTFH.find(j => j.id === journeeId);
          if (existingJournee) {
            return existingJournee;
          }
        }
        
        if (journeeData) {
          return {
            id: journeeId,
            date: journeeData.setting_value || '',
            libelle: journeeData.description || `Journée ${journeeId}`
          };
        }
        
        return {
          id: journeeId,
          date: '',
          libelle: `Journée ${journeeId}`
        };
      });
      
      setJourneesTFH(journees);
      setHasLoadedJournees(true); // Marquer comme chargé
    } catch (err) {
      console.error('Erreur chargement journées TFH:', err);
      showMessage('error', 'Erreur lors du chargement des journées TFH');
    } finally {
      setLoadingJournees(false);
    }
  }, [hasLoadedJournees, journeesTFH]); // Dépendances limitées
  
  // Modifiez useEffect pour n'exécuter qu'une fois
  useEffect(() => {
    loadSystemSettings();
    if (!hasLoadedJournees) {
      loadJourneesTFH();
    }
  }, [loadSystemSettings, loadJourneesTFH, hasLoadedJournees]);

  // Fonction pour détecter les sessions basées sur les dates
  const detecterSessions = useCallback(() => {
    const joursAvecDates = journeesTFH
      .filter(j => j.date)
      .map(j => ({
        id: j.id,
        date: new Date(j.date),
        timestamp: new Date(j.date).getTime()
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (joursAvecDates.length < 2) return {};

    const sessions: Record<number, number> = {};
    let sessionId = 1;
    let derniereDate: Date | null = null;

    joursAvecDates.forEach((jour, index) => {
      if (!derniereDate) {
        sessions[jour.id] = sessionId;
      } else {
        // Calculer la différence en jours
        const diffJours = Math.floor(
          (jour.timestamp - derniereDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Si plus de 7 jours d'écart, nouvelle session
        if (diffJours > 7) {
          sessionId++;
        }
        sessions[jour.id] = sessionId;
      }
      derniereDate = jour.date;
    });

    return sessions;
  }, [journeesTFH]);

  // Récupérer la couleur de session
  const getSessionColor = useCallback((journee: JourneeTFH) => {
    if (!journee.date) return 'bg-white';
    
    const sessions = detecterSessions();
    const sessionId = sessions[journee.id];
    
    if (!sessionId) return 'bg-white';
    
    const couleursSession = [
      'bg-blue-100 border-l-4 border-blue-400',
      'bg-green-100 border-l-4 border-green-400',
      'bg-purple-100 border-l-4 border-purple-400',
      'bg-yellow-100 border-l-4 border-yellow-400',
      'bg-pink-100 border-l-4 border-pink-400',
      'bg-indigo-100 border-l-4 border-indigo-400',
    ];
    
    const couleurIndex = (sessionId - 1) % couleursSession.length;
    return couleursSession[couleurIndex];
  }, [detecterSessions]);

  // Obtenir le nom de la session
  const getSessionName = useCallback((journeeId: number) => {
    const sessions = detecterSessions();
    const sessionId = sessions[journeeId];
    
    if (!sessionId) return '';
    
    const nomsSession = ['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5', 'Session 6'];
    const nomIndex = (sessionId - 1) % nomsSession.length;
    return nomsSession[nomIndex];
  }, [detecterSessions]);

  // Toggle d'une section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Gestion du paramètre fonctionnel
  const toggleLecteurInterne = async (enabled: boolean) => {
    setLoadingSettings(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'guide_lecteur_interne_enabled',
          setting_value: enabled ? 'true' : 'false',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });
      
      if (error) throw error;
      
      setLecteurInterneEnabled(enabled);
      showMessage('info', `Onglet "Lecteur interne" ${enabled ? 'activé' : 'désactivé'} pour les guides.`);
    } catch (err) {
      console.error('Erreur mise à jour paramètre:', err);
      showMessage('error', 'Erreur lors de la mise à jour');
    } finally {
      setLoadingSettings(false);
    }
  };

  // Sauvegarde des paramètres d'affichage
  const saveDisplaySetting = async (key: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: key,
          setting_value: value ? 'true' : 'false',
          description: getSettingDescription(key),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });
      
      if (error) throw error;
      
      setDisplaySettings(prev => ({ ...prev, [key]: value }));
      showMessage('info', 'Paramètre sauvegardé');
    } catch (err) {
      console.error('Erreur sauvegarde paramètre:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    }
  };

  // Description des paramètres
  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      'guide_lecteur_interne_enabled': 'Autoriser les guides à sélectionner des TFH en tant que lecteur interne',
      'lecteur_externe_voir_eleves': 'Les lecteurs externes voient-ils les noms/prénoms des élèves ?',
      'lecteur_externe_voir_guides': 'Les lecteurs externes voient-ils les noms/prénoms des guides ?',
      'lecteur_externe_voir_lecteurs_internes': 'Les lecteurs externes voient-ils les noms/prénoms des lecteurs internes ?',
      'lecteur_externe_voir_mediateurs': 'Les lecteurs externes voient-ils les noms/prénoms des médiateurs ?',
      'lecteur_interne_voir_eleves': 'Les lecteurs internes voient-ils les noms/prénoms des élèves ?',
      'lecteur_interne_voir_guides': 'Les lecteurs internes voient-ils les noms/prénoms des guides ?',
      'lecteur_interne_voir_lecteurs_externes': 'Les lecteurs internes voient-ils les noms/prénoms des lecteurs externes ?',
      'lecteur_interne_voir_mediateurs': 'Les lecteurs internes voient-ils les noms/prénoms des médiateurs ?',
      'mediateur_voir_eleves': 'Les médiateurs voient-ils les noms/prénoms des élèves ?',
      'mediateur_voir_guides': 'Les médiateurs voient-ils les noms/prénoms des guides ?',
      'mediateur_voir_lecteurs_internes': 'Les médiateurs voient-ils les noms/prénoms des lecteurs internes ?',
      'mediateur_voir_lecteurs_externes': 'Les médiateurs voient-ils les noms/prénoms des lecteurs externes ?',
    };
    
    return descriptions[key] || 'Paramètre d\'affichage';
  };

  // Sauvegarde d'une journée
  const saveJourneeDate = async (journeeId: number, date: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: `Journee_${journeeId}`,
          setting_value: date,
          description: `Journée ${journeeId}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      setJourneesTFH(prev => prev.map(j => j.id === journeeId ? { ...j, date } : j));
      showMessage('info', `Date de la journée ${journeeId} sauvegardée`);
    } catch (err) {
      console.error('Erreur sauvegarde journée:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde de toutes les journées
  const saveAllJournees = async () => {
    setSaving(true);
    try {
      const updates = journeesTFH.map(journee => ({
        setting_key: `Journee_${journee.id}`,
        setting_value: journee.date,
        description: `Journée ${journee.id}`,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'setting_key' });
      
      if (error) throw error;
      showMessage('info', 'Toutes les dates ont été sauvegardées !');
    } catch (err) {
      console.error('Erreur sauvegarde globale:', err);
      showMessage('error', 'Erreur lors de la sauvegarde globale');
    } finally {
      setSaving(false);
    }
  };

  // Ajouter une journée supplémentaire
  const addJournee = () => {
    const nouvelleJourneeId = journeesTFH.length + 1;
    setJourneesTFH(prev => [
      ...prev,
      {
        id: nouvelleJourneeId,
        date: '',
        libelle: `Journée ${nouvelleJourneeId}`
      }
    ]);
  };

  // Effacer toutes les dates
  const clearAllDates = () => {
    if (confirm('Voulez-vous effacer toutes les dates ?')) {
      setJourneesTFH(prev => prev.map(j => ({ ...j, date: '' })));
      showMessage('info', 'Toutes les dates ont été effacées localement. N\'oubliez pas de sauvegarder.');
    }
  };

  // Rendu des messages
  const renderMessage = () => {
    if (!settingsMessage) return null;
  
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md">
        <div className={`${
          settingsMessage.type === 'info' 
            ? 'bg-blue-50 border-blue-200 text-blue-700'  // Info = bleu
            : 'bg-red-50 border-red-200 text-red-700'     // Error = rouge
        } border rounded-lg p-4 shadow-lg flex items-center gap-2`}>
          {settingsMessage.type === 'info' ? (
            <Info className="w-5 h-5" />  // Icône info
          ) : (
            <AlertCircle className="w-5 h-5" />  // Icône alerte
          )}
          <span className="font-medium">{settingsMessage.text}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderMessage()}
      
      {/* Section 1: Paramètres fonctionnels */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('fonctionnels')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800">Paramètres fonctionnels</h3>
              <p className="text-sm text-gray-500">Gestion des autorisations et fonctionnalités</p>
            </div>
          </div>
          {expandedSections.fonctionnels ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.fonctionnels && (
          <div className="px-6 pb-6 pt-2 border-t">
            <div className="border border-blue-200 rounded-lg p-6 mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">🚦</span>
                Autorisations
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">Onglet "Lecteur interne" pour les guides</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      Autorise les guides à sélectionner des TFH en tant que lecteur interne
                    </p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={lecteurInterneEnabled}
                        onChange={(e) => toggleLecteurInterne(e.target.checked)}
                        disabled={loadingSettings}
                      />
                      <div className={`block w-14 h-8 rounded-full ${lecteurInterneEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${lecteurInterneEnabled ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {lecteurInterneEnabled ? 'Activé' : 'Désactivé'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Section 2: Paramètres d'affichage */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('affichage')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800">Paramètres d'affichage</h3>
              <p className="text-sm text-gray-500">Anonymisation et visibilité par rôle</p>
            </div>
          </div>
          {expandedSections.affichage ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.affichage && (
          <div className="px-6 pb-6 pt-2 border-t">
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">👁️</span>
                  Vue Lecteur Externe
                  <span className="text-sm font-normal text-gray-500 ml-2">(que voient les lecteurs externes ?)</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleSetting
                    label="Voir les élèves (noms & prénoms)"
                    checked={displaySettings.lecteur_externe_voir_eleves}
                    onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_eleves', checked)}
                  />
                  <ToggleSetting
                    label="Voir les guides (noms & prénoms)"
                    checked={displaySettings.lecteur_externe_voir_guides}
                    onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_guides', checked)}
                  />
                  <ToggleSetting
                    label="Voir les lecteurs internes (noms & prénoms)"
                    checked={displaySettings.lecteur_externe_voir_lecteurs_internes}
                    onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_lecteurs_internes', checked)}
                  />
                  <ToggleSetting
                    label="Voir les médiateurs (noms & prénoms)"
                    checked={displaySettings.lecteur_externe_voir_mediateurs}
                    onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_mediateurs', checked)}
                  />
                </div>
              </div>
              
              <div className="border rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">📖</span>
                  Vue Lecteur Interne
                  <span className="text-sm font-normal text-gray-500 ml-2">(que voient les lecteurs internes ?)</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleSetting
                    label="Voir les élèves (noms & prénoms)"
                    checked={displaySettings.lecteur_interne_voir_eleves}
                    onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_eleves', checked)}
                  />
                  <ToggleSetting
                    label="Voir les guides (noms & prénoms)"
                    checked={displaySettings.lecteur_interne_voir_guides}
                    onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_guides', checked)}
                  />
                  <ToggleSetting
                    label="Voir les lecteurs externes (noms & prénoms)"
                    checked={displaySettings.lecteur_interne_voir_lecteurs_externes}
                    onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_lecteurs_externes', checked)}
                  />
                  <ToggleSetting
                    label="Voir les médiateurs (noms & prénoms)"
                    checked={displaySettings.lecteur_interne_voir_mediateurs}
                    onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_mediateurs', checked)}
                  />
                </div>
              </div>
              
              <div className="border rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">⚖️</span>
                  Vue Médiateur
                  <span className="text-sm font-normal text-gray-500 ml-2">(que voient les médiateurs ?)</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleSetting
                    label="Voir les élèves (noms & prénoms)"
                    checked={displaySettings.mediateur_voir_eleves}
                    onChange={(checked) => saveDisplaySetting('mediateur_voir_eleves', checked)}
                  />
                  <ToggleSetting
                    label="Voir les guides (noms & prénoms)"
                    checked={displaySettings.mediateur_voir_guides}
                    onChange={(checked) => saveDisplaySetting('mediateur_voir_guides', checked)}
                  />
                  <ToggleSetting
                    label="Voir les lecteurs internes (noms & prénoms)"
                    checked={displaySettings.mediateur_voir_lecteurs_internes}
                    onChange={(checked) => saveDisplaySetting('mediateur_voir_lecteurs_internes', checked)}
                  />
                  <ToggleSetting
                    label="Voir les lecteurs externes (noms & prénoms)"
                    checked={displaySettings.mediateur_voir_lecteurs_externes}
                    onChange={(checked) => saveDisplaySetting('mediateur_voir_lecteurs_externes', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Section 3: Paramètres de l'année TFH */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('annee')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800">Paramètres de l'année TFH</h3>
              <p className="text-sm text-gray-500">Configuration des journées TFH</p>
            </div>
          </div>
          {expandedSections.annee ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.annee && (
          <div className="px-6 pb-6 pt-2 border-t">
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                Configurez les dates des journées TFH pour l'année scolaire en cours.
                Ces dates seront utilisées pour le suivi et le calendrier.
              </p>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {journeesTFH.filter(j => j.date).length} / {journeesTFH.length} dates définies
                </div>
                <button
                  onClick={loadJourneesTFH}
                  disabled={loadingJournees}
                  className="text-sm text-orange-600 hover:text-orange-800 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingJournees ? 'animate-spin' : ''}`} />
                  Recharger
                </button>
              </div>
            </div>
            
            {loadingJournees ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <>
                {/* TABLEAU DES JOURNÉES */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          N°
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Journée
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {journeesTFH.map((journee) => (
                        <tr 
                          key={journee.id} 
                          className={`hover:bg-gray-50 transition-colors ${getSessionColor(journee)}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <div className="w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-700 rounded-lg font-medium">
                                {journee.id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Journée {journee.id}
                              </div>
                              <div className="text-xs text-gray-500">
                                {journee.libelle}
                                {getSessionName(journee.id) && (
                                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                    {getSessionName(journee.id)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <input
                                type="date"
                                value={journee.date}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  setJourneesTFH(prev => prev.map(j => 
                                    j.id === journee.id ? { ...j, date: newDate } : j
                                  ));
                                }}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                              {journee.date && (
                                <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                                  {new Date(journee.date).toLocaleDateString('fr-FR', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveJourneeDate(journee.id, journee.date)}
                                disabled={!journee.date || saving}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                  journee.date && !saving
                                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {saving ? '...' : 'Sauvegarder'}
                              </button>
                              {journee.date && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Si vous désirez réellement supprimer l'existence d'une journée ${journee.id}, veuillez utilisez le bouton "Sauvegarder toute les dates" ci-dessous ?`)) {
                                      setJourneesTFH(prev => prev.map(j => 
                                        j.id === journee.id ? { ...j, date: '' } : j
                                      ));
                                    }
                                  }}
                                  disabled={saving}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-xs font-medium disabled:opacity-50"
                                >
                                  Effacer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* BOUTON POUR AJOUTER DES JOURNÉES */}
                <div className="mb-6">
                  <button
                    onClick={addJournee}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter une journée supplémentaire
                  </button>
                </div>			
                
                {/* BOUTONS D'ACTION */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                  <div className="flex gap-3">
                    <button
                      onClick={clearAllDates}
                      disabled={saving || journeesTFH.filter(j => j.date).length === 0}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Tout effacer
                    </button>
                    <button
                      onClick={saveAllJournees}
                      disabled={saving || journeesTFH.filter(j => j.date).length === 0}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        journeesTFH.filter(j => j.date).length > 0 && !saving
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Sauvegarde...' : 'Sauvegarder toutes les dates'}
                    </button>
                  </div>
                </div>
                
                {/* LÉGENDE ET CONSEILS */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="text-sm font-medium text-orange-800 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Sessions détectées automatiquement
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const sessions = detecterSessions();
                        const sessionsUniques = Array.from(new Set(Object.values(sessions))).sort();
                        
                        return sessionsUniques.map(sessionId => {
                          const joursDansSession = Object.entries(sessions)
                            .filter(([_, sId]) => sId === sessionId)
                            .map(([jourId]) => parseInt(jourId));
                          
                          const dates = joursDansSession
                            .map(id => journeesTFH.find(j => j.id === id)?.date)
                            .filter(Boolean)
                            .map(date => new Date(date!));
                          
                          const couleursSession = [
                            { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
                            { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
                            { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
                            { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
                            { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
                            { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
                          ];
                          
                          const couleurIndex = (sessionId - 1) % couleursSession.length;
                          const couleur = couleursSession[couleurIndex];
                          
                          return (
                            <div key={sessionId} className="flex items-center gap-3 p-2 rounded-lg bg-white border">
                              <div className={`w-4 h-4 rounded ${couleur.bg} border ${couleur.border}`}></div>
                              <div className="text-sm">
                                <span className={`font-medium ${couleur.text}`}>Session {sessionId}</span>
                                <span className="ml-2 text-gray-700">
                                  J{joursDansSession.join(', J')}
                                  {dates.length > 0 && (
                                    <span className="text-gray-500 ml-2">
                                      ({dates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})
                                    </span>
                                  )}
                                </span>
                                {dates.length > 1 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {dates.length} journ{dates.length > 1 ? 'ées' : 'ée'} sur {
                                      Math.floor((dates[dates.length-1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)) + 1
                                    } jour{Math.floor((dates[dates.length-1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)) + 1 > 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                      
                      {Object.keys(detecterSessions()).length === 0 && (
                        <div className="text-center py-3">
                          <p className="text-sm text-gray-600 italic">
                            Ajoutez des dates pour voir les sessions regroupées automatiquement
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Les journées à moins de 7 jours d'écart forment une même session
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Règles de regroupement
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Les journées sont regroupées par session</li>
                      <li>• Une session = dates à moins de 7 jours d'écart</li>
                      <li>• Chaque session a une couleur distincte</li>
                      <li>• Les journées sans date restent neutres (blanc)</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
