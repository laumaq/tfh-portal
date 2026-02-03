// app/dashboard/coordinateur/tabs/ParametresTab.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings, Eye, Calendar, ChevronRight, RefreshCw, 
  Save, Plus, Info, ChevronDown, ChevronUp, GraduationCap,
  CheckCircle, AlertCircle
} from 'lucide-react';
import ToggleSetting from '../components/ToggleSettings';

interface JourneeTFH {
  id: number;
  date: string;
  libelle: string;
}

interface JourneeDefense {
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
    fonctionnels: false,
    affichage: false,
    annee: false,
    defenses:false
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

    // Paramètres des défenses TFH
  const [journeesDefense, setJourneesDefense] = useState<JourneeDefense[]>([]);
  const [loadingDefenses, setLoadingDefenses] = useState(false);
  const [savingDefenses, setSavingDefenses] = useState(false);
  const [hasLoadedDefenses, setHasLoadedDefenses] = useState(false);
  
    // Objectif général TFH
  const [objectifGeneral, setObjectifGeneral] = useState('');
  const [savingObjectif, setSavingObjectif] = useState(false);

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

      // Charger l'objectif général
      const { data: objectifData } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'objectif_general_tfh')
        .single();
      
      if (objectifData) {
        setObjectifGeneral(objectifData.setting_value || '');
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
        .not('setting_key', 'like', 'Journee_defense_%') // EXCLURE les défenses
        .order('setting_key');
      
      if (error) throw error;
      
      // CRITIQUE : Ne créer que les journées qui existent dans la base
      // OU les 10 premières si aucune journée n'existe
      if (!data || data.length === 0) {
        // Initialiser avec 10 journées vides
        const journees = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          date: '',
          libelle: `Journée ${i + 1}`
        }));
        setJourneesTFH(journees);
        setHasLoadedJournees(true);
        return;
      }
      
      // Récupérer les IDs existants pour déterminer le max
      const existingIds = data.map(item => {
        const match = item.setting_key.match(/Journee_(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }).filter(id => id > 0);
      
      const maxId = Math.max(...existingIds);
      
      // CRÉATION DU TABLEAU : Seulement les journées qui existent
      const journees = Array.from({ length: Math.max(maxId, 10) }, (_, i) => {
        const journeeId = i + 1;
        const journeeData = data?.find(d => d.setting_key === `Journee_${journeeId}`);
        
        // Si la journée existe dans la base, l'utiliser
        if (journeeData) {
          return {
            id: journeeId,
            date: journeeData.setting_value || '',
            libelle: journeeData.description || `Journée ${journeeId}`
          };
        }
        
        // Si la journée n'existe pas dans la base mais est dans la plage, la créer vide
        if (journeeId <= maxId) {
          return {
            id: journeeId,
            date: '',
            libelle: `Journée ${journeeId}`
          };
        }
        
        // Pour les IDs supérieurs au max, ne pas les créer du tout
        return null;
      }).filter((j): j is JourneeTFH => j !== null);
      
      setJourneesTFH(journees);
      setHasLoadedJournees(true);
      
    } catch (err) {
      console.error('Erreur chargement journées TFH:', err);
      showMessage('error', 'Erreur lors du chargement des journées TFH');
    } finally {
      setLoadingJournees(false);
    }
  }, []);

  
  const loadJourneesDefense = useCallback(async () => {
    setLoadingDefenses(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .like('setting_key', 'Journee_defense_%')
        .order('setting_key');
      
      if (error) throw error;
      
      // Si aucune donnée n'existe encore, initialiser avec un tableau vide
      if (!data || data.length === 0) {
        setJourneesDefense([]);
        setHasLoadedDefenses(true);
        return;
      }
      
      // Récupérer les données de la base
      const journees = data.map(item => {
        const match = item.setting_key.match(/Journee_defense_(\d+)/);
        if (match) {
          return {
            id: parseInt(match[1]),
            date: item.setting_value || '',
            libelle: item.description || `Défense TFH ${match[1]}`
          };
        }
        return null;
      })
      .filter((j): j is JourneeDefense => j !== null)
      .sort((a, b) => a.id - b.id); // Trier par ID
      
      setJourneesDefense(journees);
      setHasLoadedDefenses(true);
    } catch (err) {
      console.error('Erreur chargement défenses TFH:', err);
      showMessage('error', 'Erreur lors du chargement des défenses TFH');
    } finally {
      setLoadingDefenses(false);
    }
  }, []);
    

  useEffect(() => {
    loadSystemSettings();
    if (!hasLoadedJournees) {
      loadJourneesTFH();
    }
    if (!hasLoadedDefenses) {
      loadJourneesDefense();
    }
  }, [loadSystemSettings, loadJourneesTFH, loadJourneesDefense, hasLoadedJournees, hasLoadedDefenses]);

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
    setExpandedSections(prev => {
      // Créer un nouvel objet avec toutes les sections repliées
      const newState = {
        fonctionnels: false,
        affichage: false,
        annee: false,
        defenses: false
      };
      
      newState[section] = !prev[section];
      
      return newState;
    });
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

  // Sauvegarder l'objectif général
  const saveObjectifGeneral = async () => {
    if (objectifGeneral.trim() === '') {
      showMessage('error', 'L\'objectif ne peut pas être vide');
      return;
    }
  
    setSavingObjectif(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'objectif_general_tfh',
          setting_value: objectifGeneral,
          description: 'Objectif général pour tous les élèves TFH',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });
      
      if (error) throw error;
      
      showMessage('info', 'Objectif général sauvegardé avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde objectif:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingObjectif(false);
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
      if (date.trim() === '') {
        // SUPPRESSION : Si date vide, supprimer la ligne
        const { error } = await supabase
          .from('system_settings')
          .delete()
          .eq('setting_key', `Journee_${journeeId}`);
        
        if (error) throw error;
        
        // IMPORTANT : Mettre la date à vide dans l'état, mais garder la ligne
        setJourneesTFH(prev => prev.map(j => 
          j.id === journeeId ? { ...j, date: '' } : j
        ));
        
        showMessage('info', `Journée ${journeeId} supprimée de la base de données`);
      } else {
        // SAUVEGARDE : Si date non vide, upsert normal
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: `Journee_${journeeId}`,
            setting_value: date,
            description: `Journée ${journeeId}`,
            updated_at: new Date().toISOString()
          }, { onConflict: 'setting_key' });
        
        if (error) throw error;
        
        setJourneesTFH(prev => prev.map(j => 
          j.id === journeeId ? { ...j, date } : j
        ));
        
        showMessage('info', `Date de la journée ${journeeId} sauvegardée`);
      }
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
      // Préparer les opérations d'upsert et delete
      const upserts: any[] = [];
      const deletes: string[] = [];
      
      journeesTFH.forEach(journee => {
        if (journee.date.trim() === '') {
          // Ajouter à la liste des suppressions
          deletes.push(`Journee_${journee.id}`);
        } else {
          // Ajouter à la liste des upserts
          upserts.push({
            setting_key: `Journee_${journee.id}`,
            setting_value: journee.date,
            description: `Journée ${journee.id}`,
            updated_at: new Date().toISOString()
          });
        }
      });
      
      // Exécuter les suppressions si nécessaire
      if (deletes.length > 0) {
        const { error: deleteError } = await supabase
          .from('system_settings')
          .delete()
          .in('setting_key', deletes);
        
        if (deleteError) throw deleteError;
      }
      
      // Exécuter les upserts si nécessaire
      if (upserts.length > 0) {
        const { error: upsertError } = await supabase
          .from('system_settings')
          .upsert(upserts, { onConflict: 'setting_key' });
        
        if (upsertError) throw upsertError;
      }
      
      // APRÈS LA SAUVEGARDE : Recharger pour nettoyer les lignes sans date
      // Cela enlèvera les journées qui ont été supprimées
      if (deletes.length > 0) {
        await loadJourneesTFH();
      }
      
      showMessage('info', `${upserts.length} journée(s) sauvegardée(s) et ${deletes.length} journée(s) supprimée(s) !`);
    } catch (err) {
      console.error('Erreur sauvegarde globale:', err);
      showMessage('error', 'Erreur lors de la sauvegarde globale');
    } finally {
      setSaving(false);
    }
  };


  // Ajouter une journée supplémentaire
  const addJournee = () => {
    // Trouver le prochain ID disponible
    const existingIds = journeesTFH.map(j => j.id);
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nouvelleJourneeId = maxId + 1;
    
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
    if (confirm('Voulez-vous effacer toutes les dates ? Cette action supprimera aussi les entrées de la base de données.')) {
      // D'abord vider localement
      setJourneesTFH(prev => prev.map(j => ({ ...j, date: '' })));
      
      // Ensuite supprimer de la base
      supabase
        .from('system_settings')
        .delete()
        .like('setting_key', 'Journee_%')
        .not('setting_key', 'like', 'Journee_defense_%')
        .then(({ error }) => {
          if (error) {
            console.error('Erreur suppression:', error);
            showMessage('error', 'Erreur lors de la suppression');
          } else {
            showMessage('info', 'Toutes les dates ont été effacées.');
          }
        });
    }
  };

  const saveJourneeDefense = async (journeeId: number, date: string) => {
    setSavingDefenses(true);
    try {
      // Toujours sauvegarder (même si date vide)
      // C'est plus simple de toujours upsert, et gérer l'affichage côté front
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: `Journee_defense_${journeeId}`,
          setting_value: date, // Peut être une chaîne vide
          description: `Journée de défense des TFH ${journeeId}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setJourneesDefense(prev => {
        const existing = prev.find(j => j.id === journeeId);
        if (existing) {
          return prev.map(j => j.id === journeeId ? { ...j, date } : j);
        } else {
          return [...prev, { id: journeeId, date, libelle: `Défense TFH ${journeeId}` }]
            .sort((a, b) => a.id - b.id);
        }
      });
      
      if (date.trim() === '') {
        showMessage('info', `Défense ${journeeId} marquée comme sans date`);
      } else {
        showMessage('info', `Date de la défense ${journeeId} sauvegardée`);
      }
    } catch (err) {
      console.error('Erreur sauvegarde défense:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingDefenses(false);
    }
  };
  
  // 2. Nouvelle fonction pour supprimer définitivement une défense
  const deleteJourneeDefense = async (journeeId: number) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement la défense ${journeeId} ?`)) {
      return;
    }
    
    setSavingDefenses(true);
    try {
      // 1. Supprimer de la base de données
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('setting_key', `Journee_defense_${journeeId}`);
      
      if (error) throw error;
      
      // 2. Supprimer de l'état local
      setJourneesDefense(prev => prev.filter(j => j.id !== journeeId));
      
      showMessage('info', `Défense ${journeeId} supprimée définitivement`);
    } catch (err) {
      console.error('Erreur suppression défense:', err);
      showMessage('error', 'Erreur lors de la suppression');
    } finally {
      setSavingDefenses(false);
    }
  };

  // Sauvegarder toutes les défenses
  const saveAllDefenses = async () => {
    setSavingDefenses(true);
    try {
      // Sauvegarder toutes les défenses existantes
      const upserts = journeesDefense.map(journee => ({
        setting_key: `Journee_defense_${journee.id}`,
        setting_value: journee.date, // Peut être vide
        description: `Journée de défense des TFH ${journee.id}`,
        updated_at: new Date().toISOString()
      }));
      
      // Exécuter les upserts
      const { error } = await supabase
        .from('system_settings')
        .upsert(upserts, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      // Nettoyer les défenses sans date de la base (optionnel)
      const { error: deleteError } = await supabase
        .from('system_settings')
        .delete()
        .in('setting_key', journeesDefense
          .filter(j => j.date.trim() === '')
          .map(j => `Journee_defense_${j.id}`)
        );
      
      if (deleteError) {
        console.warn('Avertissement suppression défenses vides:', deleteError);
      }
      
      // Recharger pour avoir l'état à jour
      await loadJourneesDefense();
      
      showMessage('info', `${journeesDefense.filter(j => j.date.trim() !== '').length} défense(s) sauvegardée(s)`);
    } catch (err) {
      console.error('Erreur sauvegarde globale des défenses:', err);
      showMessage('error', 'Erreur lors de la sauvegarde globale');
    } finally {
      setSavingDefenses(false);
    }
  };

  // NOUVEAU : Ajouter une journée de défense
  const addJourneeDefense = () => {
    const nouvelleJourneeId = journeesDefense.length > 0 
      ? Math.max(...journeesDefense.map(j => j.id)) + 1 
      : 1;
    
    setJourneesDefense(prev => [
      ...prev,
      {
        id: nouvelleJourneeId,
        date: '',
        libelle: `Défense TFH ${nouvelleJourneeId}`
      }
    ]);
  };

  // Effacer toutes les dates de défense
  const clearAllDefenseDates = async () => {
    if (confirm('Voulez-vous effacer toutes les dates de défense ? Les défenses sans date seront supprimées de la base.')) {
      setSavingDefenses(true);
      try {
        // Supprimer toutes les défenses de la base
        const { error } = await supabase
          .from('system_settings')
          .delete()
          .like('setting_key', 'Journee_defense_%');
        
        if (error) throw error;
        
        // Vider l'état local
        setJourneesDefense([]);
        
        showMessage('info', 'Toutes les défenses ont été supprimées.');
      } catch (err) {
        console.error('Erreur suppression défenses:', err);
        showMessage('error', 'Erreur lors de la suppression');
      } finally {
        setSavingDefenses(false);
      }
    }
  };

  // NOUVEAU : Supprimer une défense spécifique
  const removeJourneeDefense = (journeeId: number) => {
    if (confirm(`Voulez-vous vraiment supprimer la défense ${journeeId} ?`)) {
      // Supprimer immédiatement de l'état local
      setJourneesDefense(prev => prev.filter(j => j.id !== journeeId));
      showMessage('info', `Défense ${journeeId} supprimée localement. Sauvegardez pour appliquer à la base.`);
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

            <div className="border border-green-200 rounded-lg p-6 mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">🎯</span>
                Objectif général TFH
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="objectif-general" className="block text-sm font-medium text-gray-700 mb-2">
                    Objectif pédagogique pour tous les élèves
                  </label>
                  <textarea
                    id="objectif-general"
                    value={objectifGeneral}
                    onChange={(e) => setObjectifGeneral(e.target.value)}
                    className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Exemple : Développer une approche critique et méthodique du travail de recherche..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Cet objectif sera visible par tous les utilisateurs selon leurs droits d'accès.
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={saveObjectifGeneral}
                    disabled={savingObjectif || objectifGeneral.trim() === ''}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                      objectifGeneral.trim() !== '' && !savingObjectif
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {savingObjectif ? 'Sauvegarde...' : 'Sauvegarder l\'objectif'}
                  </button>
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

      {/* NOUVELLE SECTION 4: Paramètres des défenses TFH */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('defenses')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800">Paramètres des défenses TFH</h3>
              <p className="text-sm text-gray-500">Configuration des journées de défense</p>
            </div>
          </div>
          {expandedSections.defenses ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.defenses && (
          <div className="px-6 pb-6 pt-2 border-t">
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                Configurez les dates des journées de défense des TFH pour l'année scolaire en cours.
                Ces dates sont distinctes des journées de travail régulières.
              </p>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {journeesDefense.filter(j => j.date).length} défense(s) programmée(s)
                </div>
                <button
                  onClick={loadJourneesDefense}
                  disabled={loadingDefenses}
                  className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDefenses ? 'animate-spin' : ''}`} />
                  Recharger
                </button>
              </div>
            </div>
            
            {loadingDefenses ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <>
                {/* TABLEAU DES DÉFENSES */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          N°
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Défense
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {journeesDefense.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            Aucune défense programmée. Ajoutez-en une avec le bouton ci-dessous.
                          </td>
                        </tr>
                      ) : (
                        {journeesDefense.map((journee) => (
                          <tr key={journee.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-lg font-medium">
                                  {journee.id}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  Défense TFH {journee.id}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {journee.libelle}
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
                                    setJourneesDefense(prev => prev.map(j => 
                                      j.id === journee.id ? { ...j, date: newDate } : j
                                    ));
                                  }}
                                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                                  onClick={() => saveJourneeDefense(journee.id, journee.date)}
                                  disabled={savingDefenses}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                    !savingDefenses
                                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {savingDefenses ? '...' : 'Sauvegarder'}
                                </button>
                                <button
                                  onClick={() => deleteJourneeDefense(journee.id)}
                                  disabled={savingDefenses}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium disabled:opacity-50"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))})
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BOUTON POUR AJOUTER DES DÉFENSES */}
                <div className="mb-6">
                  <button
                    onClick={addJourneeDefense}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter une journée de défense
                  </button>
                </div>
                
                {/* BOUTONS D'ACTION */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                  <div className="flex gap-3">
                    <button
                      onClick={clearAllDefenseDates}
                      disabled={savingDefenses || journeesDefense.length === 0}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Tout effacer
                    </button>
                    <button
                      onClick={saveAllDefenses}
                      disabled={savingDefenses || journeesDefense.filter(j => j.date).length === 0}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        journeesDefense.filter(j => j.date).length > 0 && !savingDefenses
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      {savingDefenses ? 'Sauvegarde...' : 'Sauvegarder toutes les défenses'}
                    </button>
                  </div>
                </div>
                
                {/* INFORMATION */}
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Informations importantes
                  </h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Les journées de défense sont distinctes des journées de travail régulières</li>
                    <li>• Utilisez le bouton "Sauvegarder" sur chaque ligne pour valider individuellement</li>
                    <li>• Une suppression nécessite une sauvegarde pour être appliquée</li>
                    <li>• Les dates sont stockées au format YYYY-MM-DD dans la base</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
