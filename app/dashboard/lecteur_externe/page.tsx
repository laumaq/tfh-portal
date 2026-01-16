// app/dashboard/lecteur_externe/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CalendarDisplayLecteurExterne from '@/app/components/CalendarDisplayLecteurExterne';
import ProfileEditor from '../../components/ProfileEditor';

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  categorie: string;
  guide_id: string;
  date_defense: string | null;
  heure_defense: string | null;
  localisation_defense: string | null;
  lecteur_interne_id: string | null;
  lecteur_externe_id: string | null;
  mediateur_id: string | null;
  guide_nom?: string;
  guide_prenom?: string;
  lecteur_interne_nom?: string;
  lecteur_interne_prenom?: string;
  lecteur_externe_nom?: string;
  lecteur_externe_prenom?: string;
  mediateur_nom?: string;
  mediateur_prenom?: string;
}

interface DefenseEvent {
  id: string;
  eleveId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  eleveNom: string;
  elevePrenom: string;
  guideNom: string;
  guidePrenom: string;
  lecteurInterneNom: string;
  lecteurInternePrenom: string;
  lecteurExterneNom: string;
  lecteurExternePrenom: string;
  mediateurNom: string;
  mediateurPrenom: string;
  categorie: string;
  problematique: string;
}

type ViewMode = 'choice' | 'planning' | 'list' | 'calendar' | 'question-view' | 'question-dates' | 'question-categories';

export default function LecteurExterneDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userLecteurExterneId, setUserLecteurExterneId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('choice');
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [defenseEvents, setDefenseEvents] = useState<DefenseEvent[]>([]);
  const [busySlots, setBusySlots] = useState<Map<string, string[]>>(new Map());
  const [tempViewMode, setTempViewMode] = useState<'list' | 'calendar'>('list');
  const [tempSelectedDates, setTempSelectedDates] = useState<string[]>([]);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [selectedMultipleDates, setSelectedMultipleDates] = useState<string[]>([]);
  const [selectedMultipleCategories, setSelectedMultipleCategories] = useState<string[]>([]);
  const [selectedMultipleLocations, setSelectedMultipleLocations] = useState<string[]>([]);
  const router = useRouter();

  // CORRECTION: Déplacer displaySettings AVANT les useEffect
  const [displaySettings, setDisplaySettings] = useState({
    lecteur_externe_voir_eleves: true,
    lecteur_externe_voir_guides: true,
    lecteur_externe_voir_lecteurs_internes: true,
    lecteur_externe_voir_mediateurs: true,
  });

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');

    if (userType !== 'lecteur_externe' || !userId) {
      router.push('/');
      return;
    }

    setUserName(name || '');
    setUserLecteurExterneId(userId);
    loadData(userId);
  }, [router]);

  const loadData = async (lecteurExterneId: string) => {
    try {
      setLoading(true);

      const loadDisplaySettings = async () => {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
              'lecteur_externe_voir_eleves',
              'lecteur_externe_voir_guides',
              'lecteur_externe_voir_lecteurs_internes',
              'lecteur_externe_voir_mediateurs'
            ]);
      
          if (error) throw error;
      
          if (data) {
            const settings: any = {};
            data.forEach(setting => {
              settings[setting.setting_key] = setting.setting_value === 'true';
            });
            setDisplaySettings(prev => ({ ...prev, ...settings }));
          }
        } catch (err) {
          console.error('Erreur chargement paramètres:', err);
        }
      };
      
      await loadDisplaySettings();  
      
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, prenom),
          lecteur_interne:guides!lecteur_interne_id (nom, prenom),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .eq('lecteur_externe_id', lecteurExterneId)
        .order('date_defense', { ascending: true, nullsFirst: true })
        .order('heure_defense', { ascending: true, nullsFirst: true })
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

      const elevesFormatted = (elevesData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_prenom: eleve.guide?.prenom || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_prenom: eleve.lecteur_interne?.prenom || '-',
        lecteur_externe_nom: eleve.lecteur_externe?.nom || '-',
        lecteur_externe_prenom: eleve.lecteur_externe?.prenom || '-',
        mediateur_nom: eleve.mediateur?.nom || '-',
        mediateur_prenom: eleve.mediateur?.prenom || '-'
      }));

      setEleves(elevesFormatted);

      const { data: allElevesData, error: allElevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, prenom),
          lecteur_interne:guides!lecteur_interne_id (nom, prenom),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom)
        `)
        .not('categorie', 'is', null)
        .not('categorie', 'eq', '')
        .order('date_defense', { ascending: true, nullsFirst: true })
        .order('heure_defense', { ascending: true, nullsFirst: true })
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (allElevesError) throw allElevesError;

      const allElevesFormatted = (allElevesData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_prenom: eleve.guide?.prenom || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_prenom: eleve.lecteur_interne?.prenom || '-',
        lecteur_externe_nom: eleve.lecteur_externe?.nom || '-',
        lecteur_externe_prenom: eleve.lecteur_externe?.prenom || '-'
      }));

      setElevesDisponibles(allElevesFormatted);

      const uniqueCategories = Array.from(
        new Set(allElevesFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      const uniqueDates = Array.from(
        new Set(allElevesFormatted
          .filter(e => e.date_defense)
          .map(e => e.date_defense!))
      ).sort();
      setDates(uniqueDates);
      setSelectedDates(uniqueDates);

      const uniqueLocations = Array.from(
        new Set(allElevesFormatted
          .filter(e => e.localisation_defense)
          .map(e => e.localisation_defense!))
      ).sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
      setLocations(uniqueLocations);
      setSelectedLocations(uniqueLocations);

      setSelectedMultipleDates(uniqueDates);
      setSelectedMultipleCategories(uniqueCategories);
      setSelectedMultipleLocations(uniqueLocations);
      
      const preSelected = allElevesFormatted
        .filter(e => e.lecteur_externe_id === lecteurExterneId)
        .map(e => e.id);
      setSelectedEleves(preSelected);

      generateBusySlots(elevesFormatted, lecteurExterneId);

    } catch (err) {
      console.error('Erreur chargement des données:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderCheckboxFilter = (
    title: string,
    items: string[],
    selectedItems: string[],
    onSelectChange: (items: string[]) => void,
    getDisplayName?: (item: string) => string
  ) => {
    const allSelected = selectedItems.length === items.length;
    const noneSelected = selectedItems.length === 0;
  
    const handleToggleAll = () => {
      if (allSelected) {
        onSelectChange([]);
      } else {
        onSelectChange([...items]);
      }
    };
  
    const handleToggleItem = (item: string) => {
      if (selectedItems.includes(item)) {
        onSelectChange(selectedItems.filter(i => i !== item));
      } else {
        onSelectChange([...selectedItems, item]);
      }
    };
  
    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-700">
            {title} ({selectedItems.length}/{items.length})
          </label>
          <button
            onClick={handleToggleAll}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {allSelected ? "Aucun" : "Tout"}
          </button>
        </div>
  
        <div className="border border-gray-300 rounded-lg p-2 max-h-60 overflow-y-auto bg-white">
          {items.map(item => {
            const isSelected = selectedItems.includes(item);
            const displayName = getDisplayName ? getDisplayName(item) : item;
            
            return (
              <div
                key={item}
                className="flex items-center py-1.5 px-1 hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => handleToggleItem(item)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleItem(item)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  id={`filter-${title}-${item}`}
                  onClick={(e) => e.stopPropagation()}
                />
                <label
                  htmlFor={`filter-${title}-${item}`}
                  className="ml-2 text-xs text-gray-700 cursor-pointer flex-1 truncate"
                  title={displayName}
                >
                  {displayName}
                </label>
              </div>
            );
          })}
        </div>
  
        {selectedItems.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Sélectionné(s) :</div>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedItems.slice(0, 5).map(item => {
                const displayName = getDisplayName ? getDisplayName(item) : item;
                return (
                  <span
                    key={item}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                    title={displayName}
                  >
                    {displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleItem(item);
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              {selectedItems.length > 5 && (
                <span className="text-xs text-gray-500">
                  +{selectedItems.length - 5} autre{selectedItems.length - 5 > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const generateBusySlots = (assignedEleves: Eleve[], lecteurExterneId: string) => {
    const slotsMap = new Map<string, string[]>();
    
    assignedEleves.forEach(eleve => {
      if (eleve.date_defense && eleve.heure_defense) {
        const slotKey = `${eleve.date_defense}_${eleve.heure_defense.substring(0, 5)}`;
        const currentIds = slotsMap.get(slotKey) || [];
        slotsMap.set(slotKey, [...currentIds, eleve.id]);
      }
    });

    setBusySlots(slotsMap);
  };

  const add50Minutes = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    let newHours = hours;
    let newMinutes = minutes + 50;
    
    if (newMinutes >= 60) {
      newHours += Math.floor(newMinutes / 60);
      newMinutes = newMinutes % 60;
    }
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const prepareCalendarData = () => {
    const defensesWithSchedule = elevesDisponibles.filter(e => 
      e.date_defense && e.heure_defense
    );
    
    const events: DefenseEvent[] = defensesWithSchedule.map(eleve => {
      const startTime = eleve.heure_defense!.substring(0, 5);
      
      return {
        id: eleve.id,
        eleveId: eleve.id,
        date: eleve.date_defense!,
        startTime: startTime,
        endTime: add50Minutes(startTime),
        location: eleve.localisation_defense || 'Non défini',
        eleveNom: eleve.nom,
        elevePrenom: eleve.prenom,
        guideNom: eleve.guide_nom || '-',
        guidePrenom: eleve.guide_prenom || '-',
        lecteurInterneNom: eleve.lecteur_interne_nom || '-',
        lecteurInternePrenom: eleve.lecteur_interne_prenom || '-',
        lecteurExterneNom: eleve.lecteur_externe_nom || '-',
        lecteurExternePrenom: eleve.lecteur_externe_prenom || '-',
        mediateurNom: '-',
        mediateurPrenom: '-',
        categorie: eleve.categorie || 'Non catégorisé',
        problematique: eleve.problematique || ''
      };
    });

    setDefenseEvents(events);
  };

  useEffect(() => {
    if (elevesDisponibles.length > 0) {
      prepareCalendarData();
    }
  }, [elevesDisponibles]);

  const isTimeSlotBusy = (eleve: Eleve): boolean => {
    if (!eleve.date_defense || !eleve.heure_defense) return false;
    
    const slotKey = `${eleve.date_defense}_${eleve.heure_defense.substring(0, 5)}`;
    const busyElevesIds = busySlots.get(slotKey) || [];
    
    if (busyElevesIds.includes(eleve.id)) {
      return false;
    }
    
    return busyElevesIds.length > 0;
  };

  const sortEleves = (eleves: Eleve[]): Eleve[] => {
    return [...eleves].sort((a, b) => {
      if (!a.date_defense && b.date_defense) return 1;
      if (a.date_defense && !b.date_defense) return -1;
      if (a.date_defense && b.date_defense) {
        const dateCompare = a.date_defense.localeCompare(b.date_defense);
        if (dateCompare !== 0) return dateCompare;
      }
      
      if (!a.heure_defense && b.heure_defense) return 1;
      if (a.heure_defense && !b.heure_defense) return -1;
      if (a.heure_defense && b.heure_defense) {
        const timeCompare = a.heure_defense.localeCompare(b.heure_defense);
        if (timeCompare !== 0) return timeCompare;
      }
      
      const classCompare = a.classe.localeCompare(b.classe);
      if (classCompare !== 0) return classCompare;
      
      return a.nom.localeCompare(b.nom);
    });
  };

  const filteredElevesDisponibles = elevesDisponibles.filter(eleve => {
    if (selectedMultipleCategories.length > 0 && !selectedMultipleCategories.includes(eleve.categorie)) {
      return false;
    }
    
    if (selectedMultipleDates.length > 0 && eleve.date_defense && !selectedMultipleDates.includes(eleve.date_defense)) {
      return false;
    }
    
    if (selectedMultipleLocations.length > 0 && eleve.localisation_defense && !selectedMultipleLocations.includes(eleve.localisation_defense)) {
      return false;
    }
    
    return true;
  });

  const sortedElevesDisponibles = sortEleves(filteredElevesDisponibles);
  
  const handleToggleSelection = async (eleveId: string) => {
    const eleve = elevesDisponibles.find(e => e.id === eleveId);
    if (eleve && isTimeSlotBusy(eleve)) {
      const busySlotKey = `${eleve.date_defense}_${eleve.heure_defense!.substring(0, 5)}`;
      const busyElevesIds = busySlots.get(busySlotKey) || [];
      const busyEleves = elevesDisponibles.filter(e => busyElevesIds.includes(e.id));
      const busyNames = busyEleves.map(e => `${e.prenom} ${e.nom}`).join(', ');
      
      alert(`Vous avez déjà une défense à ce créneau horaire !\n\nCréneau occupé par: ${busyNames}`);
      return;
    }

    const newSelectedEleves = selectedEleves.includes(eleveId)
      ? selectedEleves.filter(id => id !== eleveId)
      : [...selectedEleves, eleveId];
    
    setSelectedEleves(newSelectedEleves);

    try {
      await supabase
        .from('eleves')
        .update({ lecteur_externe_id: null })
        .eq('lecteur_externe_id', userLecteurExterneId);

      if (newSelectedEleves.length > 0) {
        await supabase
          .from('eleves')
          .update({ lecteur_externe_id: userLecteurExterneId })
          .in('id', newSelectedEleves);
      }

      await loadData(userLecteurExterneId);
      
    } catch (err) {
      console.error('Erreur lors de la sauvegarde automatique:', err);
      setSelectedEleves(selectedEleves);
      alert('Erreur lors de l\'enregistrement automatique');
    }
  };

  const handleSelectAll = () => {
    const availableEleves = sortedElevesDisponibles.filter(eleve => !isTimeSlotBusy(eleve));
    
    if (selectedEleves.length === availableEleves.length) {
      setSelectedEleves([]);
    } else {
      setSelectedEleves(availableEleves.map(e => e.id));
    }
  };

  const handleCalendarEventClick = (event: DefenseEvent) => {
    const eleve = elevesDisponibles.find(e => e.id === event.eleveId);
    if (eleve) {
      handleToggleSelection(eleve.id);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/connexion-lecteur-externe/');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatHeure = (heureString: string | null) => {
    if (!heureString) return '-';
    return heureString.substring(0, 5);
  };

  const goToFinalView = () => {
    const finalDates = tempSelectedDates.length > 0 ? tempSelectedDates : dates;
    const finalCategories = tempSelectedCategories.length > 0 ? tempSelectedCategories : categories;
    
    setSelectedMultipleDates(finalDates);
    setSelectedMultipleCategories(finalCategories);
    setSelectedMultipleLocations(locations);
    
    setViewMode(tempViewMode);
  };

  // Écran de choix initial
  if (viewMode === 'choice') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenue {userName} !</h1>
            <p className="text-gray-600">Que souhaitez-vous faire aujourd'hui ?</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setViewMode('planning')}
              className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Voir mon planning</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Consulter les {eleves.length} TFH qui me sont assignés
                  </p>
                </div>
                <div className="ml-auto text-gray-400 group-hover:text-blue-600">
                  →
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setTempViewMode('list');
                setViewMode('question-view');
              }}
              className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Choisir des TFH</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Sélectionner de nouveaux TFH à évaluer
                  </p>
                </div>
                <div className="ml-auto text-gray-400 group-hover:text-green-600">
                  →
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question 1: Vue liste ou calendrier
  if (viewMode === 'question-view') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Quelle vue préférez-vous ?</h1>
            <p className="text-gray-600">Comment souhaitez-vous voir les TFH disponibles ?</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                setTempViewMode('list');
                setViewMode('question-dates');
              }}
              className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Vue liste</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Liste tabulaire avec tous les détails
                  </p>
                </div>
                <div className="ml-auto text-gray-400 group-hover:text-blue-600">
                  →
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setTempViewMode('calendar');
                setViewMode('question-dates');
              }}
              className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Vue calendrier</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Représentation visuelle par jour et heure
                  </p>
                </div>
                <div className="ml-auto text-gray-400 group-hover:text-green-600">
                  →
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setViewMode('choice')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question 2: Quels jours ?
  if (viewMode === 'question-dates') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Quels jours vous intéressent ?</h1>
            <p className="text-gray-600">Sélectionnez un ou plusieurs jours</p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => {
                setTempSelectedDates(dates);
                setViewMode('question-categories');
              }}
              className={`w-full p-4 rounded-lg border text-left ${
                tempSelectedDates.length === dates.length
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                    tempSelectedDates.length === dates.length 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {tempSelectedDates.length === dates.length && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </div>
                  <span className="font-medium">Tous les jours</span>
                </div>
              </div>
            </button>

            {dates.map(date => {
              const isSelected = tempSelectedDates.includes(date);
              return (
                <button
                  key={date}
                  onClick={() => {
                    const newDates = isSelected
                      ? tempSelectedDates.filter(d => d !== date)
                      : [...tempSelectedDates, date];
                    setTempSelectedDates(newDates);
                  }}
                  className={`w-full p-4 rounded-lg border text-left ${
                    isSelected
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="text-white text-sm">✓</span>}
                      </div>
                      <div>
                        <div className="font-medium">
                          {new Date(date).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setViewMode('question-view')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              ← Retour
            </button>
            <button
              onClick={() => {
                if (tempSelectedDates.length === 0) {
                  setTempSelectedDates(dates);
                }
                setViewMode('question-categories');
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {tempSelectedDates.length === 0 ? 'Passer' : 'Continuer'} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question 3: Quelles thématiques ?
  if (viewMode === 'question-categories') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Quelles thématiques ?</h1>
            <p className="text-gray-600">Sélectionnez une ou plusieurs thématiques</p>
          </div>

          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
            <button
              onClick={() => {
                setTempSelectedCategories(categories);
                goToFinalView();
              }}
              className={`w-full p-4 rounded-lg border text-left ${
                tempSelectedCategories.length === categories.length
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                    tempSelectedCategories.length === categories.length 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {tempSelectedCategories.length === categories.length && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </div>
                  <span className="font-medium">Toutes les thématiques</span>
                </div>
              </div>
            </button>

            {categories.map(categorie => {
              const isSelected = tempSelectedCategories.includes(categorie);
              return (
                <button
                  key={categorie}
                  onClick={() => {
                    const newCategories = isSelected
                      ? tempSelectedCategories.filter(c => c !== categorie)
                      : [...tempSelectedCategories, categorie];
                    setTempSelectedCategories(newCategories);
                  }}
                  className={`w-full p-4 rounded-lg border text-left ${
                    isSelected
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="text-white text-sm">✓</span>}
                      </div>
                      <span className="font-medium">{categorie}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setViewMode('question-dates')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              ← Retour
            </button>
            <button
              onClick={goToFinalView}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voir les TFH →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CORRECTION: Vue list/calendar - JSX corrigé
  if (viewMode === 'list' || viewMode === 'calendar') {
    const busyCount = sortedElevesDisponibles.filter(e => isTimeSlotBusy(e)).length;
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Barre d'en-tête fixe */}
        <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                  {viewMode === 'list' ? 'Sélection en liste' : 'Sélection en calendrier'}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    Connecté en tant que {userName}
                  </p>
                  <button
                    onClick={() => setShowProfileEditor(true)}
                    className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    title="Modifier mon profil"
                  >
                    ✎
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setViewMode('planning')}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                >
                  Voir mon planning
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-1"
                >
                  <span>{showFilters ? '▼' : '▲'}</span>
                  <span>Filtres</span>
                </button>
                <button
                  onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  {viewMode === 'list' ? '📅 Calendrier' : '📋 Liste'}
                </button>
                <button
                  onClick={() => setViewMode('choice')}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  Menu
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Déconnexion
                </button>
              </div>
            </div>
            
            {/* Résumé des filtres */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                {selectedEleves.length} TFH sélectionné{selectedEleves.length > 1 ? 's' : ''}
              </span>
              
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                <span>📅</span>
                <span>
                  {selectedMultipleDates.length === 0 || selectedMultipleDates.length === dates.length 
                    ? "Tous les jours" 
                    : `${selectedMultipleDates.length} jour${selectedMultipleDates.length > 1 ? 's' : ''}`}
                </span>
              </span>
              
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                <span>🏷️</span>
                <span>
                  {selectedMultipleCategories.length === 0 || selectedMultipleCategories.length === categories.length 
                    ? "Toutes les thématiques" 
                    : `${selectedMultipleCategories.length} thème${selectedMultipleCategories.length > 1 ? 's' : ''}`}
                </span>
              </span>
              
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1">
                <span>🏢</span>
                <span>
                  {selectedMultipleLocations.length === 0 || selectedMultipleLocations.length === locations.length 
                    ? "Tous les locaux" 
                    : {selectedMultipleLocations.length === 1 
                      ? "1 local"
                      : `${selectedMultipleLocations.length} locaux`}
                </span>
              </span>
            </div>
          </div>

          {/* CORRECTION: Section filtres déplacée ICI (dans la même div parente) */}
          {showFilters && (
            <div className="border-t border-gray-200 bg-white">
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Filtre Jours */}
                  {renderCheckboxFilter(
                    "Jours",
                    dates,
                    selectedMultipleDates,
                    setSelectedMultipleDates,
                    (date) => new Date(date).toLocaleDateString('fr-FR', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })
                  )}
          
                  {/* Filtre Thématiques */}
                  {renderCheckboxFilter(
                    "Thématiques",
                    categories,
                    selectedMultipleCategories,
                    setSelectedMultipleCategories
                  )}
          
                  {/* Filtre Locaux */}
                  {renderCheckboxFilter(
                    "Locaux",
                    locations,
                    selectedMultipleLocations,
                    setSelectedMultipleLocations
                  )}
                </div>
                
                {/* Boutons d'action rapide */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3">
                  <div className="text-xs text-gray-600">
                    <span className="text-blue-600">✓ Sélectionnés par vous</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedMultipleDates(dates);
                        setSelectedMultipleCategories(categories);
                        setSelectedMultipleLocations(locations);
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors flex items-center gap-1"
                    >
                      <span>✓</span>
                      <span>Tout sélectionner</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedMultipleDates([]);
                        setSelectedMultipleCategories([]);
                        setSelectedMultipleLocations([]);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors flex items-center gap-1"
                    >
                      <span>✗</span>
                      <span>Tout effacer</span>
                    </button>
                    
                    <button
                      onClick={() => setShowFilters(false)}
                      className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 hover:border-green-300 transition-colors flex items-center gap-1"
                    >
                      <span>▼</span>
                      <span>Fermer filtres</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div> 

        {/* Contenu principal */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          {/* Vue liste */}
          {viewMode === 'list' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                        {/* Checkbox */}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Heure
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Local
                      </th>
                      
                      {displaySettings.lecteur_externe_voir_eleves && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                          Élève
                        </th>
                      )}
                      
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Problématique
                      </th>
                      
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Thématique
                      </th>
                      
                      {displaySettings.lecteur_externe_voir_guides && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                          Guide
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedElevesDisponibles.length === 0 ? (
                      <tr>
                        <td colSpan={
                            2 + // Date, Heure
                            1 + // Local
                            3 + // Thématique, Problématique
                            (displaySettings.lecteur_externe_voir_eleves ? 1 : 0) +
                            (displaySettings.lecteur_externe_voir_guides ? 1 : 0)
                          }  className="px-4 py-8 text-center text-gray-500">
                          Aucun élève trouvé avec ces filtres.
                        </td>
                      </tr>
                    ) : (
                      sortedElevesDisponibles.map((eleve) => {
                        const isBusy = isTimeSlotBusy(eleve);
                        const isSelected = selectedEleves.includes(eleve.id);
                        const isCurrentlyAssigned = eleve.lecteur_externe_id === userLecteurExterneId;
                        
                        return (
                          <tr 
                            key={eleve.id} 
                            className={`hover:bg-gray-50 ${
                              isBusy && !isCurrentlyAssigned 
                                ? 'bg-gray-100 opacity-60' 
                                : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelection(eleve.id)}
                                disabled={isBusy && !isCurrentlyAssigned}
                                className={`w-4 h-4 text-blue-600 rounded ${
                                  isBusy && !isCurrentlyAssigned 
                                    ? 'cursor-not-allowed opacity-50' 
                                    : 'cursor-pointer'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <div className={`px-2 py-1 rounded inline-block ${
                                eleve.date_defense
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {formatDate(eleve.date_defense)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {formatHeure(eleve.heure_defense)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {eleve.localisation_defense || '-'}
                            </td>
                            
                            {displaySettings.lecteur_externe_voir_eleves && (
                              <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                {eleve.nom} {eleve.prenom}
                              </td>
                            )}
                            
                            <td className="px-4 py-3 text-sm max-w-xs">
                              <div className="whitespace-pre-wrap max-h-24 overflow-y-auto pr-2 text-xs">
                                {eleve.problematique || '-'}
                              </div>
                            </td>
                            
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs whitespace-nowrap">
                                {eleve.categorie || '-'}
                              </span>
                            </td>
                            
                            {displaySettings.lecteur_externe_voir_guides && (
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                {eleve.guide_prenom} {eleve.guide_nom}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Vue calendrier */
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <CalendarDisplayLecteurExterne
                  eleves={sortedElevesDisponibles}
                  selectedCategory={selectedCategorie}
                  selectedDates={selectedDates}
                  selectedLocations={selectedLocations}
                  onEventClick={handleCalendarEventClick}
                  selectedEventIds={selectedEleves}
                  busyEventIds={(() => {
                    const allBusyIds = new Set<string>();
                    busySlots.forEach((eleveIds, slotKey) => {
                      eleveIds.forEach(id => {
                        const eleve = elevesDisponibles.find(e => e.id === id);
                        if (eleve && eleve.lecteur_externe_id !== userLecteurExterneId) {
                          allBusyIds.add(id);
                        }
                      });
                    });
                    return Array.from(allBusyIds);
                  })()}
                  userLecteurExterneId={userLecteurExterneId}
                  displaySettings={displaySettings}
                />
              </div>
            </div>
          )}
        </div>

        {/* PROFIL EDITOR */}
        {showProfileEditor && (
          <ProfileEditor
            userId={userLecteurExterneId}
            userType="lecteur_externe"
            onClose={() => setShowProfileEditor(false)}
            onUpdate={() => {
              const name = localStorage.getItem('userName');
              if (name) setUserName(name);
            }}
          />
        )}
      </div>
    );
  }

  // Vue planning (dashboard)
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Planning ({eleves.length} élèves)</h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
              <button
                onClick={() => setShowProfileEditor(true)}
                className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                title="Modifier mon profil"
              >
                ✎
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('choice')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm md:text-base"
            >
              Menu principal
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
            >
              Choisir des TFH
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm md:text-base"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {eleves.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun élève assigné</h3>
            <p className="text-gray-500 mb-6">Aucun TFH ne vous est actuellement assigné comme lecteur externe.</p>
            <button
              onClick={() => setViewMode('list')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Sélectionner des TFH
            </button>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            <div className="flex gap-4 mb-6">
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {eleves.length} TFH assigné{eleves.length > 1 ? 's' : ''}
              </span>
              <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                {eleves.filter(e => e.date_defense).length} avec date de défense
              </span>
              <span className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                {eleves.filter(e => !e.date_defense).length} sans date
              </span>
            </div>

            {/* Tableau des élèves assignés */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="min-w-[1200px] md:min-w-full">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lieu</th>
                      {displaySettings.lecteur_externe_voir_eleves && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                      )}

                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                      
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thématique</th>
                      {displaySettings.lecteur_externe_voir_guides && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                      )}
                      
                      {displaySettings.lecteur_externe_voir_lecteurs_internes && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                      )}
                      
                      {displaySettings.lecteur_externe_voir_mediateurs && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                      )}
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
                        
                        {displaySettings.lecteur_externe_voir_eleves && (
                          <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                            {eleve.nom} {eleve.prenom}
                          </td>
                        )}
                        
                        <td className="px-4 py-3 text-sm max-w-md">
                          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                            {eleve.problematique || '-'}
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {eleve.categorie || '-'}
                          </span>
                        </td>
                        
                        {displaySettings.lecteur_externe_voir_guides && (
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.guide_prenom} {eleve.guide_nom}
                          </td>
                        )}
                        
                        {displaySettings.lecteur_externe_voir_lecteurs_internes && (
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.lecteur_interne_prenom} {eleve.lecteur_interne_nom}
                          </td>
                        )}
                                              
                        {displaySettings.lecteur_externe_voir_mediateurs && (
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {eleve.mediateur_prenom} {eleve.mediateur_nom}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Note informative */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <span>
              Ce tableau affiche les TFH qui vous sont assignés comme lecteur externe, triés par date de défense.
              Pour modifier votre sélection, utilisez le bouton "Choisir des TFH".
            </span>
          </p>
        </div>
        
        {/* PROFIL EDITOR */}
        {showProfileEditor && (
          <ProfileEditor
            userId={userLecteurExterneId}
            userType="lecteur_externe"
            onClose={() => setShowProfileEditor(false)}
            onUpdate={() => {
              const name = localStorage.getItem('userName');
              if (name) setUserName(name);
            }}
          />
        )}
      </div>
    </div>
  );
}
