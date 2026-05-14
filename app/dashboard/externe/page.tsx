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
  guide?: { nom: string; prenom: string };
  lecteur_interne?: { nom: string; prenom: string };
  lecteur_externe?: { nom: string; prenom: string };
  mediateur?: { nom: string; prenom: string };
  url_tfh?: string;
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

type ViewMode = 'choice' | 'planning' | 'list' | 'calendar' | 'question-view' | 'question-dates' | 'question-categories' | 'question-format' | 'thankyou';

export default function ExterneDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [externeId, setExterneId] = useState<string>('');
  const [lecteurExterneId, setLecteurExterneId] = useState<string>('');
  const [mediateurId, setMediateurId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('choice');
  const [selectedElevesAsLecteur, setSelectedElevesAsLecteur] = useState<string[]>([]);
  const [selectedElevesAsMediateur, setSelectedElevesAsMediateur] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [defenseEvents, setDefenseEvents] = useState<DefenseEvent[]>([]);
  const [busySlotsLecteur, setBusySlotsLecteur] = useState<Map<string, string[]>>(new Map());
  const [busySlotsMediateur, setBusySlotsMediateur] = useState<Map<string, string[]>>(new Map());
  const [tempViewMode, setTempViewMode] = useState<'list' | 'calendar'>('list');
  const [tempSelectedDates, setTempSelectedDates] = useState<string[]>([]);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [selectedMultipleDates, setSelectedMultipleDates] = useState<string[]>([]);
  const [selectedMultipleCategories, setSelectedMultipleCategories] = useState<string[]>([]);
  const [selectedMultipleLocations, setSelectedMultipleLocations] = useState<string[]>([]);
  const [tempFormatChoice, setTempFormatChoice] = useState<'papier' | 'numerique' | null>(null);
  const [accepteNumerique, setAccepteNumerique] = useState<boolean>(false);
  const router = useRouter();

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

    if (userType !== 'externe' || !userId) {
      router.push('/connexion-externe');
      return;
    }

    setUserName(name || '');
    setExterneId(userId);
    loadUserRoles();
  }, [router]);

  const loadUserRoles = async () => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/connexion-externe');
      return;
    }
  
    try {
      const { data, error } = await supabase
        .from('externes')
        .select('id, lecteur_externe_id, mediateur_id, accepte_numerique')
        .eq('id', storedUserId)
        .single();
  
      if (error || !data) {
        router.push('/connexion-externe');
        return;
      }
  
      setExterneId(data.id);
      setLecteurExterneId(data.lecteur_externe_id || '');
      setMediateurId(data.mediateur_id || '');
      setAccepteNumerique(data.accepte_numerique || false);
      await loadData(data.lecteur_externe_id || '', data.mediateur_id || '');
    } catch (err) {
      console.error(err);
      router.push('/connexion-externe');
    }
  };

  const loadData = async (lecteurExterneIdVal: string, mediateurIdVal: string) => {
    try {
      setLoading(true);
  
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'lecteur_externe_voir_eleves',
          'lecteur_externe_voir_guides',
          'lecteur_externe_voir_lecteurs_internes',
          'lecteur_externe_voir_mediateurs'
        ]);
  
      if (settingsData) {
        const settings: any = {};
        settingsData.forEach(setting => {
          settings[setting.setting_key] = setting.setting_value === 'true';
        });
        setDisplaySettings(prev => ({ ...prev, ...settings }));
      }
  
      let allAssigned: Eleve[] = [];
  
      if (lecteurExterneIdVal) {
        const { data: lecteurData } = await supabase
          .from('eleves')
          .select('*')
          .eq('lecteur_externe_id', lecteurExterneIdVal);
        if (lecteurData) allAssigned = [...allAssigned, ...lecteurData];
      }
      
      if (mediateurIdVal) {
        const { data: mediateurData } = await supabase
          .from('eleves')
          .select('*')
          .eq('mediateur_id', mediateurIdVal);
        if (mediateurData) allAssigned = [...allAssigned, ...mediateurData];
      }
  
      const uniqueAssigned = Array.from(new Map(allAssigned.map(e => [e.id, e])).values());
      const elevesFormatted = uniqueAssigned.map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide_nom || '-',
        guide_prenom: eleve.guide_prenom || '-',
        lecteur_interne_nom: eleve.lecteur_interne_nom || '-',
        lecteur_interne_prenom: eleve.lecteur_interne_prenom || '-',
        lecteur_externe_nom: eleve.lecteur_externe_nom || '-',
        lecteur_externe_prenom: eleve.lecteur_externe_prenom || '-',
        mediateur_nom: eleve.mediateur_nom || '-',
        mediateur_prenom: eleve.mediateur_prenom || '-'
      }));
      setEleves(elevesFormatted);
  
      const { data: allElevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('*')
        .not('categorie', 'is', null)
        .not('categorie', 'eq', '')
        .order('date_defense', { ascending: true, nullsFirst: true })
        .order('heure_defense', { ascending: true, nullsFirst: true })
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });
  
      if (elevesError) throw elevesError;
  
      const { data: allGuides } = await supabase
        .from('guides')
        .select('id, nom, prenom');
  
      const guidesMap = new Map();
      if (allGuides) {
        allGuides.forEach(guide => {
          guidesMap.set(guide.id, guide);
        });
      }
  
      const { data: allExternes } = await supabase
        .from('externes')
        .select('id, nom, prenom, lecteur_externe_id, mediateur_id');
  
      const externesByLecteurId = new Map();
      const externesByMediateurId = new Map();
      if (allExternes) {
        allExternes.forEach(externe => {
          if (externe.lecteur_externe_id) {
            externesByLecteurId.set(externe.lecteur_externe_id, externe);
          }
          if (externe.mediateur_id) {
            externesByMediateurId.set(externe.mediateur_id, externe);
          }
        });
      }
  
      const allElevesFormatted = (allElevesData || []).map(eleve => {
        const guide = guidesMap.get(eleve.guide_id);
        const guide_nom = guide?.nom || '-';
        const guide_prenom = guide?.prenom || '-';
  
        const lecteurInterne = guidesMap.get(eleve.lecteur_interne_id);
        const lecteur_interne_nom = lecteurInterne?.nom || '-';
        const lecteur_interne_prenom = lecteurInterne?.prenom || '-';
  
        const lecteurExterne = externesByLecteurId.get(eleve.lecteur_externe_id);
        const lecteur_externe_nom = lecteurExterne?.nom || '-';
        const lecteur_externe_prenom = lecteurExterne?.prenom || '-';
  
        const mediateur = externesByMediateurId.get(eleve.mediateur_id);
        const mediateur_nom = mediateur?.nom || '-';
        const mediateur_prenom = mediateur?.prenom || '-';
  
        return {
          ...eleve,
          url_tfh: eleve.url_tfh || '',
          guide_nom,
          guide_prenom,
          lecteur_interne_nom,
          lecteur_interne_prenom,
          lecteur_externe_nom,
          lecteur_externe_prenom,
          mediateur_nom,
          mediateur_prenom
        };
      });
  
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
      ).sort();
      setLocations(uniqueLocations);
      setSelectedLocations(uniqueLocations);
  
      setSelectedMultipleDates(uniqueDates);
      setSelectedMultipleCategories(uniqueCategories);
      setSelectedMultipleLocations(uniqueLocations);
  
      const preSelectedLecteur = allElevesFormatted
        .filter(e => e.lecteur_externe_id === lecteurExterneIdVal)
        .map(e => e.id);
      const preSelectedMediateur = allElevesFormatted
        .filter(e => e.mediateur_id === mediateurIdVal)
        .map(e => e.id);
      
      setSelectedElevesAsLecteur(preSelectedLecteur);
      setSelectedElevesAsMediateur(preSelectedMediateur);
  
      generateBusySlots(elevesFormatted, lecteurExterneIdVal, mediateurIdVal);
  
    } catch (err) {
      console.error('Erreur chargement des données:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const generateBusySlots = (assignedEleves: Eleve[], lecteurExterneIdVal: string, mediateurIdVal: string) => {
    const slotsMapLecteur = new Map<string, string[]>();
    const slotsMapMediateur = new Map<string, string[]>();
    
    assignedEleves.forEach(eleve => {
      if (eleve.date_defense && eleve.heure_defense) {
        const slotKey = `${eleve.date_defense}_${eleve.heure_defense.substring(0, 5)}`;
        
        if (eleve.lecteur_externe_id === lecteurExterneIdVal) {
          const currentIds = slotsMapLecteur.get(slotKey) || [];
          slotsMapLecteur.set(slotKey, [...currentIds, eleve.id]);
        }
        
        if (eleve.mediateur_id === mediateurIdVal) {
          const currentIds = slotsMapMediateur.get(slotKey) || [];
          slotsMapMediateur.set(slotKey, [...currentIds, eleve.id]);
        }
      }
    });
  
    setBusySlotsLecteur(slotsMapLecteur);
    setBusySlotsMediateur(slotsMapMediateur);
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

  useEffect(() => {
    if (elevesDisponibles.length > 0 && (viewMode === 'list' || viewMode === 'calendar')) {
      prepareCalendarData();
    }
  }, [elevesDisponibles, viewMode]);

  const isTimeSlotBusy = (eleve: Eleve, role: 'lecteur' | 'mediateur'): boolean => {
    if (!eleve.date_defense || !eleve.heure_defense) return false;
    
    const slotKey = `${eleve.date_defense}_${eleve.heure_defense.substring(0, 5)}`;
    const busySlots = role === 'lecteur' ? busySlotsLecteur : busySlotsMediateur;
    const busyElevesIds = busySlots.get(slotKey) || [];
    
    const otherBusyIds = busyElevesIds.filter(id => id !== eleve.id);
    return otherBusyIds.length > 0;
  };

  const handleToggleSelection = async (eleveId: string, role: 'lecteur' | 'mediateur') => {
    const eleve = elevesDisponibles.find(e => e.id === eleveId);
    if (!eleve) return;
  
    const field = role === 'lecteur' ? 'lecteur_externe_id' : 'mediateur_id';
    const currentId = role === 'lecteur' ? lecteurExterneId : mediateurId;
    const isCurrentlySelected = role === 'lecteur' 
      ? selectedElevesAsLecteur.includes(eleveId)
      : selectedElevesAsMediateur.includes(eleveId);
  
    if (isTimeSlotBusy(eleve, role) && !isCurrentlySelected) {
      alert(`Vous avez déjà une défense en tant que ${role === 'lecteur' ? 'lecteur externe' : 'médiateur'} à ce créneau horaire !`);
      return;
    }
  
    const isAlreadyTaken = role === 'lecteur'
      ? (eleve.lecteur_externe_id && eleve.lecteur_externe_id !== lecteurExterneId)
      : (eleve.mediateur_id && eleve.mediateur_id !== mediateurId);
  
    if (isAlreadyTaken && !isCurrentlySelected) {
      alert(`Ce TFH a déjà un ${role === 'lecteur' ? 'lecteur externe' : 'médiateur'} assigné à quelqu\'un d'autre.`);
      return;
    }
  
    try {
      if (isCurrentlySelected) {
        await supabase
          .from('eleves')
          .update({ [field]: null })
          .eq('id', eleveId);
        
        if (role === 'lecteur') {
          setSelectedElevesAsLecteur(prev => prev.filter(id => id !== eleveId));
        } else {
          setSelectedElevesAsMediateur(prev => prev.filter(id => id !== eleveId));
        }
      } else {
        const otherRole = role === 'lecteur' ? 'mediateur' : 'lecteur';
        const otherField = otherRole === 'lecteur' ? 'lecteur_externe_id' : 'mediateur_id';
        const isOtherSelected = otherRole === 'lecteur'
          ? selectedElevesAsLecteur.includes(eleveId)
          : selectedElevesAsMediateur.includes(eleveId);
        
        if (isOtherSelected) {
          await supabase
            .from('eleves')
            .update({ [otherField]: null })
            .eq('id', eleveId);
          
          if (otherRole === 'lecteur') {
            setSelectedElevesAsLecteur(prev => prev.filter(id => id !== eleveId));
          } else {
            setSelectedElevesAsMediateur(prev => prev.filter(id => id !== eleveId));
          }
        }
        
        await supabase
          .from('eleves')
          .update({ [field]: currentId })
          .eq('id', eleveId);
        
        if (role === 'lecteur') {
          setSelectedElevesAsLecteur(prev => [...prev, eleveId]);
        } else {
          setSelectedElevesAsMediateur(prev => [...prev, eleveId]);
        }
      }
  
      setTimeout(() => {
        loadData(lecteurExterneId, mediateurId);
      }, 500);
      
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de l\'enregistrement');
      loadData(lecteurExterneId, mediateurId);
    }
  };

  const getAssignedRoleForEleve = (eleve: Eleve): string => {
    const roles = [];
    if (eleve.lecteur_externe_id === lecteurExterneId) roles.push('📖 Lecteur');
    if (eleve.mediateur_id === mediateurId) roles.push('⚖️ Médiateur');
    return roles.join(' / ') || '-';
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

  const sortEleves = (elevesList: Eleve[]): Eleve[] => {
    return [...elevesList].sort((a, b) => {
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
    
    const hasLecteurExterneTaken = eleve.lecteur_externe_id && eleve.lecteur_externe_id !== lecteurExterneId;
    const hasMediateurTaken = eleve.mediateur_id && eleve.mediateur_id !== mediateurId;
    
    if (hasLecteurExterneTaken && hasMediateurTaken) {
      return false;
    }
    
    return true;
  });

  const sortedElevesDisponibles = sortEleves(filteredElevesDisponibles);

  const renderCheckboxFilter = (
    title: string,
    items: string[],
    selectedItems: string[],
    onSelectChange: (items: string[]) => void,
    getDisplayName?: (item: string) => string
  ) => {
    const allSelected = selectedItems.length === items.length;
  
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
      </div>
    );
  };

  const handleCalendarEventClick = async (event: DefenseEvent) => {
    const eleve = elevesDisponibles.find(e => e.id === event.eleveId);
    if (!eleve) return;
  
    const lecteurSelected = selectedElevesAsLecteur.includes(eleve.id);
    const mediateurSelected = selectedElevesAsMediateur.includes(eleve.id);
    const lecteurBusy = isTimeSlotBusy(eleve, 'lecteur');
    const mediateurBusy = isTimeSlotBusy(eleve, 'mediateur');
    const lecteurTaken = eleve.lecteur_externe_id && eleve.lecteur_externe_id !== lecteurExterneId;
    const mediateurTaken = eleve.mediateur_id && eleve.mediateur_id !== mediateurId;
  
    if (lecteurSelected) {
      await handleToggleSelection(eleve.id, 'lecteur');
      return;
    }
    
    if (mediateurSelected) {
      await handleToggleSelection(eleve.id, 'mediateur');
      return;
    }
  
    let roleChoice: 'lecteur' | 'mediateur' | null = null;
    
    if (!lecteurBusy && !lecteurTaken && !mediateurBusy && !mediateurTaken) {
      roleChoice = window.confirm(`Choisir ${eleve.prenom} ${eleve.nom} comme :\n\nOK = Lecteur externe\nAnnuler = Médiateur`) 
        ? 'lecteur' 
        : 'mediateur';
    } else if (!lecteurBusy && !lecteurTaken) {
      roleChoice = 'lecteur';
    } else if (!mediateurBusy && !mediateurTaken) {
      roleChoice = 'mediateur';
    } else {
      alert(`Aucun rôle disponible pour ${eleve.prenom} ${eleve.nom}`);
      return;
    }
  
    if (roleChoice) {
      await handleToggleSelection(eleve.id, roleChoice);
    }
  };

  const goToFinalView = () => {
    const finalDates = tempSelectedDates.length > 0 ? tempSelectedDates : dates;
    const finalCategories = tempSelectedCategories.length > 0 ? tempSelectedCategories : categories;
    
    setSelectedMultipleDates(finalDates);
    setSelectedMultipleCategories(finalCategories);
    setSelectedMultipleLocations(locations);
    
    setViewMode(tempViewMode);
  };

  const handleSaveFormatPreference = async () => {
    if (!tempFormatChoice) return;
    
    const newAccepteNumerique = tempFormatChoice === 'numerique';
    
    try {
      const { error } = await supabase
        .from('externes')
        .update({ accepte_numerique: newAccepteNumerique })
        .eq('id', externeId);
      
      if (error) throw error;
      
      setAccepteNumerique(newAccepteNumerique);
      
      // Mettre à jour le localStorage si nécessaire
      if (newAccepteNumerique) {
        localStorage.setItem('userFormat', 'numerique');
      } else {
        localStorage.removeItem('userFormat');
      }
      
      setViewMode('thankyou');
    } catch (err) {
      console.error('Erreur sauvegarde préférence:', err);
      alert('Erreur lors de l\'enregistrement de votre préférence');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/connexion-externe');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

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
                    Consulter les {eleves.length} défenses qui me sont assignées
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
                    Sélectionner de nouveaux TFH à évaluer (lecteur ou médiateur)
                  </p>
                </div>
                <div className="ml-auto text-gray-400 group-hover:text-green-600">
                  →
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowProfileEditor(true)}
              className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <span className="text-2xl">⚙️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Mes paramètres</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Modifier mes informations personnelles et préférences
                  </p>
                </div>
                <div className="ml-auto text-gray-400 group-hover:text-gray-600">
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
                setViewMode('question-format');
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
              onClick={() => setViewMode('question-format')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continuer →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question 4: Préférence de format (papier ou numérique)
  if (viewMode === 'question-format') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Préférence de format</h1>
            <p className="text-gray-600">Comment souhaitez-vous recevoir les TFH ?</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setTempFormatChoice('papier')}
              className={`w-full p-6 rounded-xl shadow-sm border-2 transition-all text-left ${
                tempFormatChoice === 'papier'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Version papier</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Je reçois une copie papier des TFH
                  </p>
                </div>
                {tempFormatChoice === 'papier' && (
                  <div className="ml-auto text-blue-500">✓</div>
                )}
              </div>
            </button>

            <button
              onClick={() => setTempFormatChoice('numerique')}
              className={`w-full p-6 rounded-xl shadow-sm border-2 transition-all text-left ${
                tempFormatChoice === 'numerique'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💻</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Version numérique</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Je préfère consulter les TFH en ligne
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    🌱 Ce choix diminue le nombre d'impressions que les élèves doivent prendre en charge à leurs frais
                  </p>
                </div>
                {tempFormatChoice === 'numerique' && (
                  <div className="ml-auto text-green-500">✓</div>
                )}
              </div>
            </button>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setViewMode('question-categories')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              ← Retour
            </button>
            <button
              onClick={handleSaveFormatPreference}
              disabled={!tempFormatChoice}
              className={`flex-1 px-4 py-2 rounded-lg ${
                tempFormatChoice
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirmer →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Écran de remerciement
  if (viewMode === 'thankyou') {
    const isNumerique = tempFormatChoice === 'numerique';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {isNumerique ? (
              <>
                <div className="text-6xl mb-4">💚</div>
                <h1 className="text-2xl md:text-3xl font-bold text-green-700 mb-4">
                  Merci pour votre choix responsable !
                </h1>
                <p className="text-gray-700 mb-4">
                  En optant pour la version numérique, vous contribuez à réduire l'impact environnemental
                  et les frais d'impression des élèves.
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  Vous pourrez accéder aux TFH numériques en cliquant sur les problématiques dans votre planning.
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📚</div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                  Préférence enregistrée
                </h1>
                <p className="text-gray-700 mb-6">
                  Vous recevrez les TFH au format papier comme vous l'avez indiqué.
                </p>
              </>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setTempSelectedDates(dates);
                  setTempSelectedCategories(categories);
                  goToFinalView();
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Voir les TFH disponibles →
              </button>
              <button
                onClick={() => setViewMode('choice')}
                className="px-6 py-3 text-gray-600 hover:text-gray-800"
              >
                Retour au menu principal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue planning (dashboard principal)
  if (viewMode === 'planning') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Mon planning ({eleves.length} défense{eleves.length > 1 ? 's' : ''})</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
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
                Menu
              </button>
              <button
                onClick={() => {
                  setTempViewMode('list');
                  setViewMode('question-view');
                }}
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

          {/* Note pour les utilisateurs en version numérique */}
          {accepteNumerique && eleves.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-green-600 text-xl">💻</div>
                <div className="flex-1">
                  <p className="text-sm text-green-800 font-medium">
                    Vous avez choisi la version numérique.
                  </p>
                  <p className="text-sm text-green-700">
                    Vous ne recevrez <strong>pas de version papier</strong> des TFH. Les versions numériques sont accessibles en cliquant sur les problématiques dans votre planning ci-dessous.
                  </p>
                </div>
              </div>
            </div>
          )}

          {eleves.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune défense assignée</h3>
              <p className="text-gray-500 mb-6">Aucun TFH ne vous est actuellement assigné comme lecteur externe ou médiateur.</p>
              <button
                onClick={() => {
                  setTempViewMode('list');
                  setViewMode('question-view');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Sélectionner des TFH
              </button>
            </div>
          ) : (
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Votre rôle</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortEleves(eleves).map((eleve) => (
                      <tr key={eleve.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                          {formatDate(eleve.date_defense)}
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
                          {eleve.url_tfh ? (
                            <a
                              href={eleve.url_tfh}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-words"
                              title="Ouvrir le travail numérique"
                            >
                              📄 {eleve.problematique || '-'}
                            </a>
                          ) : (
                            <div className="whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                              {eleve.problematique || '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {eleve.categorie || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs ${
                            eleve.lecteur_externe_id === lecteurExterneId && eleve.mediateur_id === mediateurId
                              ? 'bg-purple-100 text-purple-800'
                              : eleve.lecteur_externe_id === lecteurExterneId
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {getAssignedRoleForEleve(eleve)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={async () => {
                              const role = eleve.lecteur_externe_id === lecteurExterneId ? 'lecteur' : 'mediateur';
                              await handleToggleSelection(eleve.id, role);
                            }}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            Désélectionner
                          </button>
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
              <span className="text-lg">💡</span>
              <span>
                Ce tableau affiche les TFH qui vous sont assignés. Vous pouvez être lecteur externe (📖) ou médiateur (⚖️).
                Pour modifier votre sélection, utilisez le bouton "Choisir des TFH".
                {accepteNumerique && " Les problématiques avec 📄 sont des liens vers les versions numériques."}
              </span>
            </p>
          </div>
        </div>

        {showProfileEditor && (
          <ProfileEditor
            userId={externeId}
            userType="externe"
            onClose={() => setShowProfileEditor(false)}
            onUpdate={async () => {
              const name = localStorage.getItem('userName');
              if (name) setUserName(name);
              // Recharger la préférence numérique
              const { data } = await supabase
                .from('externes')
                .select('accepte_numerique')
                .eq('id', externeId)
                .single();
              if (data) setAccepteNumerique(data.accepte_numerique || false);
            }}
          />
        )}
      </div>
    );
  }

  // Vue liste ou calendrier pour la sélection
  if (viewMode === 'list' || viewMode === 'calendar') {
    return (
      <div className="min-h-screen bg-gray-50">
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
            
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                📖 {selectedElevesAsLecteur.length} + ⚖️ {selectedElevesAsMediateur.length} = {selectedElevesAsLecteur.length + selectedElevesAsMediateur.length} sélectionné{(selectedElevesAsLecteur.length + selectedElevesAsMediateur.length) > 1 ? 's' : ''}
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {selectedMultipleDates.length === 0 || selectedMultipleDates.length === dates.length ? "Tous les jours" : `${selectedMultipleDates.length} jour${selectedMultipleDates.length > 1 ? 's' : ''}`}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                {selectedMultipleCategories.length === 0 || selectedMultipleCategories.length === categories.length ? "Toutes les thématiques" : `${selectedMultipleCategories.length} thème${selectedMultipleCategories.length > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {showFilters && (
            <div className="border-t border-gray-200 bg-white">
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renderCheckboxFilter(
                    "Jours",
                    dates,
                    selectedMultipleDates,
                    setSelectedMultipleDates,
                    (date) => new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                  )}
                  {renderCheckboxFilter("Thématiques", categories, selectedMultipleCategories, setSelectedMultipleCategories)}
                  {renderCheckboxFilter("Locaux", locations, selectedMultipleLocations, setSelectedMultipleLocations)}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3">
                  <div className="text-xs text-gray-600">
                    <span className="text-blue-600">✓</span> TFH que vous avez déjà sélectionnés
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedMultipleDates(dates);
                        setSelectedMultipleCategories(categories);
                        setSelectedMultipleLocations(locations);
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMultipleDates([]);
                        setSelectedMultipleCategories([]);
                        setSelectedMultipleLocations([]);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100"
                    >
                      Tout effacer
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100"
                    >
                      Fermer filtres
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          {viewMode === 'list' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                        {/* Actions */}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Heure</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Local</th>
                      {displaySettings.lecteur_externe_voir_eleves && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thématique</th>
                      {displaySettings.lecteur_externe_voir_guides && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedElevesDisponibles.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                          Aucun TFH trouvé avec ces filtres.
                        </td>
                      </tr>
                    ) : (
                      sortedElevesDisponibles.map((eleve) => {
                        const isBusyLecteur = isTimeSlotBusy(eleve, 'lecteur');
                        const isBusyMediateur = isTimeSlotBusy(eleve, 'mediateur');
                        const isLecteurSelected = selectedElevesAsLecteur.includes(eleve.id);
                        const isMediateurSelected = selectedElevesAsMediateur.includes(eleve.id);
                        const isLecteurAlreadyTaken = !!(eleve.lecteur_externe_id && eleve.lecteur_externe_id !== lecteurExterneId);
                        const isMediateurAlreadyTaken = !!(eleve.mediateur_id && eleve.mediateur_id !== mediateurId);
                        const hasConflict = (isBusyLecteur && !isLecteurSelected) || (isBusyMediateur && !isMediateurSelected);
                        
                        return (
                          <tr key={eleve.id} className={`hover:bg-gray-50 ${hasConflict ? 'bg-gray-100 opacity-60' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (isMediateurSelected) {
                                      handleToggleSelection(eleve.id, 'mediateur');
                                    }
                                    handleToggleSelection(eleve.id, 'lecteur');
                                  }}
                                  disabled={isBusyLecteur || isLecteurAlreadyTaken}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    isLecteurSelected
                                      ? 'bg-blue-600 text-white'
                                      : isBusyLecteur || isLecteurAlreadyTaken
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  }`}
                                  title={isLecteurAlreadyTaken ? "Déjà attribué à un autre lecteur" : isBusyLecteur ? "Conflit de créneau" : ""}
                                >
                                  📖 Lecteur
                                </button>
                                
                                <button
                                  onClick={() => {
                                    if (isLecteurSelected) {
                                      handleToggleSelection(eleve.id, 'lecteur');
                                    }
                                    handleToggleSelection(eleve.id, 'mediateur');
                                  }}
                                  disabled={isBusyMediateur || isMediateurAlreadyTaken}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    isMediateurSelected
                                      ? 'bg-purple-600 text-white'
                                      : isBusyMediateur || isMediateurAlreadyTaken
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                  }`}
                                  title={isMediateurAlreadyTaken ? "Déjà attribué à un autre médiateur" : isBusyMediateur ? "Conflit de créneau" : ""}
                                >
                                  ⚖️ Médiateur
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className={`px-2 py-1 rounded inline-block ${eleve.date_defense ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                {formatDate(eleve.date_defense)}
                              </span>
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
            <div className="bg-white rounded-lg shadow p-4">
              <CalendarDisplayLecteurExterne
                eleves={sortedElevesDisponibles}
                selectedCategory={selectedCategorie}
                selectedDates={selectedMultipleDates}
                selectedLocations={selectedMultipleLocations}
                onLecteurClick={(event) => handleToggleSelection(event.eleveId, 'lecteur')}
                onMediateurClick={(event) => handleToggleSelection(event.eleveId, 'mediateur')}
                selectedLecteurIds={selectedElevesAsLecteur}
                selectedMediateurIds={selectedElevesAsMediateur}
                busyLecteurIds={(() => {
                  const busyIds = new Set<string>();
                  busySlotsLecteur.forEach((ids) => {
                    ids.forEach(id => busyIds.add(id));
                  });
                  return Array.from(busyIds);
                })()}
                busyMediateurIds={(() => {
                  const busyIds = new Set<string>();
                  busySlotsMediateur.forEach((ids) => {
                    ids.forEach(id => busyIds.add(id));
                  });
                  return Array.from(busyIds);
                })()}
                lecteurExterneId={lecteurExterneId}
                mediateurId={mediateurId}
                displaySettings={displaySettings}
              />
            </div>
          )}
        </div>

        {showProfileEditor && (
          <ProfileEditor
            userId={externeId}
            userType="externe"
            onClose={() => setShowProfileEditor(false)}
            onUpdate={async () => {
              const name = localStorage.getItem('userName');
              if (name) setUserName(name);
              const { data } = await supabase
                .from('externes')
                .select('accepte_numerique')
                .eq('id', externeId)
                .single();
              if (data) setAccepteNumerique(data.accepte_numerique || false);
            }}
          />
        )}
      </div>
    );
  }

  return null;
}
