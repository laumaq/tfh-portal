// app/dashboard/lecteur_externe/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CalendarDisplay from '@/app/components/CalendarDisplay';

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
}

type ViewMode = 'choice' | 'planning' | 'list' | 'calendar' | 'question-view' | 'question-dates' | 'question-categories';
type TabType = 'dashboard' | 'selection';

export default function LecteurExterneDashboard() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userLecteurExterneId, setUserLecteurExterneId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('choice');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string>('toutes');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [defenseEvents, setDefenseEvents] = useState<DefenseEvent[]>([]);
  const [busySlots, setBusySlots] = useState<Set<string>>(new Set());
  const [tempViewMode, setTempViewMode] = useState<'list' | 'calendar'>('list');
  const [tempSelectedDates, setTempSelectedDates] = useState<string[]>([]);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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
    setUserLecteurExterneId(userId);
    loadData(userId);
  }, [router]);

  const loadData = async (lecteurExterneId: string) => {
    try {
      setLoading(true);
      
      // Charger les élèves assignés à ce lecteur externe
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

      // Charger TOUS les élèves pour la sélection
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

      // Extraire les catégories uniques
      const uniqueCategories = Array.from(
        new Set(allElevesFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      // Extraire les dates uniques
      const uniqueDates = Array.from(
        new Set(allElevesFormatted
          .filter(e => e.date_defense)
          .map(e => e.date_defense!))
      ).sort();
      setDates(uniqueDates);
      setSelectedDates(uniqueDates);

      // Extraire les locaux uniques
      const uniqueLocations = Array.from(
        new Set(allElevesFormatted
          .filter(e => e.localisation_defense)
          .map(e => e.localisation_defense!))
      ).sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
      setLocations(uniqueLocations);
      setSelectedLocations(uniqueLocations);

      // Pré-sélectionner les élèves où l'utilisateur est déjà lecteur externe
      const preSelected = allElevesFormatted
        .filter(e => e.lecteur_externe_id === lecteurExterneId)
        .map(e => e.id);
      setSelectedEleves(preSelected);

      // Générer les créneaux occupés
      generateBusySlots(elevesFormatted, lecteurExterneId);

    } catch (err) {
      console.error('Erreur chargement des données:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateBusySlots = (assignedEleves: Eleve[], lecteurExterneId: string) => {
    const slots = new Set<string>();
    
    // Ajouter les créneaux des élèves déjà assignés
    assignedEleves.forEach(eleve => {
      if (eleve.date_defense && eleve.heure_defense) {
        const slotKey = `${eleve.date_defense}_${eleve.heure_defense.substring(0, 5)}`;
        slots.add(slotKey);
      }
    });

    setBusySlots(slots);
    console.log('Créneaux occupés:', Array.from(slots));
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
        categorie: eleve.categorie || 'Non catégorisé'
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
    
    // Créer la clé du créneau
    const slotKey = `${eleve.date_defense}_${eleve.heure_defense.substring(0, 5)}`;
    
    // Vérifier si le créneau est occupé
    const isSlotBusy = busySlots.has(slotKey);
    
    // Si le créneau est occupé, vérifier si ce n'est pas déjà cet élève
    if (isSlotBusy && eleve.lecteur_externe_id === userLecteurExterneId) {
      // L'utilisateur est déjà assigné à ce créneau
      return false;
    }
    
    return isSlotBusy;
  };

  const filteredElevesDisponibles = elevesDisponibles.filter(eleve => {
    // Filtre par catégorie
    if (selectedCategorie !== 'toutes' && eleve.categorie !== selectedCategorie) {
      return false;
    }
    
    // Filtre par date
    if (selectedDates.length > 0 && eleve.date_defense && !selectedDates.includes(eleve.date_defense)) {
      return false;
    }
    
    // Filtre par local
    if (selectedLocations.length > 0 && eleve.localisation_defense && !selectedLocations.includes(eleve.localisation_defense)) {
      return false;
    }
    
    return true;
  });

  // Fonction pour trier les élèves par date, heure, classe, nom
  const sortEleves = (eleves: Eleve[]): Eleve[] => {
    return [...eleves].sort((a, b) => {
      // 1. Par date (les sans date en dernier)
      if (!a.date_defense && b.date_defense) return 1;
      if (a.date_defense && !b.date_defense) return -1;
      if (a.date_defense && b.date_defense) {
        const dateCompare = a.date_defense.localeCompare(b.date_defense);
        if (dateCompare !== 0) return dateCompare;
      }
      
      // 2. Par heure (les sans heure en dernier)
      if (!a.heure_defense && b.heure_defense) return 1;
      if (a.heure_defense && !b.heure_defense) return -1;
      if (a.heure_defense && b.heure_defense) {
        const timeCompare = a.heure_defense.localeCompare(b.heure_defense);
        if (timeCompare !== 0) return timeCompare;
      }
      
      // 3. Par classe
      const classCompare = a.classe.localeCompare(b.classe);
      if (classCompare !== 0) return classCompare;
      
      // 4. Par nom
      return a.nom.localeCompare(b.nom);
    });
  };

  const sortedElevesDisponibles = sortEleves(filteredElevesDisponibles);

  const handleToggleSelection = async (eleveId: string) => {
    const eleve = elevesDisponibles.find(e => e.id === eleveId);
    if (eleve && isTimeSlotBusy(eleve)) {
      alert('Vous avez déjà une défense à ce créneau horaire !');
      return;
    }

    const newSelectedEleves = selectedEleves.includes(eleveId)
      ? selectedEleves.filter(id => id !== eleveId)
      : [...selectedEleves, eleveId];
    
    setSelectedEleves(newSelectedEleves);

    // Enregistrement automatique
    try {
      // D'abord, retirer ce lecteur externe de tous les élèves
      await supabase
        .from('eleves')
        .update({ lecteur_externe_id: null })
        .eq('lecteur_externe_id', userLecteurExterneId);

      // Ensuite, ajouter ce lecteur externe aux élèves sélectionnés
      if (newSelectedEleves.length > 0) {
        await supabase
          .from('eleves')
          .update({ lecteur_externe_id: userLecteurExterneId })
          .in('id', newSelectedEleves);
      }

      // Recharger les données
      await loadData(userLecteurExterneId);
      
      // Feedback visuel (optionnel)
      const eleveName = eleve ? `${eleve.prenom} ${eleve.nom}` : 'TFH';
      console.log(`${eleveName} ${newSelectedEleves.includes(eleveId) ? 'sélectionné' : 'désélectionné'}`);
      
    } catch (err) {
      console.error('Erreur lors de la sauvegarde automatique:', err);
      // Revenir à l'état précédent en cas d'erreur
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
    router.push('/');
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

  // Fonction pour aller à la vue finale
  const goToFinalView = () => {
    setSelectedDates(tempSelectedDates.length > 0 ? tempSelectedDates : dates);
    setSelectedCategorie(tempSelectedCategories.length === 1 
      ? tempSelectedCategories[0] 
      : 'toutes');
    setSelectedLocations(locations);
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

  // Questions 1, 2, 3 restent identiques...
  // (garder le code existant pour question-view, question-dates, question-categories)

  // Écran de paramétrage pour la sélection (simplifié)
  if (viewMode === 'list' || viewMode === 'calendar') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Barre d'en-tête fixe */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                  {viewMode === 'list' ? 'Sélection en liste' : 'Sélection en calendrier'}
                </h1>
                <p className="text-xs md:text-sm text-gray-600 truncate">
                  Connecté en tant que {userName} • {sortedElevesDisponibles.length} TFH disponible{sortedElevesDisponibles.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                {selectedCategorie === 'toutes' 
                  ? `${categories.length} thématiques` 
                  : selectedCategorie}
              </span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                {selectedEleves.length} sélectionné{selectedEleves.length > 1 ? 's' : ''}
              </span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                {sortedElevesDisponibles.filter(e => isTimeSlotBusy(e)).length} créneau{x occupé}
              </span>
            </div>
          </div>
        </div>

        {/* Filtres simplifiés */}
        {showFilters && (
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Jours
                  </label>
                  <select
                    value="toutes"
                    onChange={(e) => {
                      if (e.target.value === 'toutes') {
                        setSelectedDates(dates);
                      } else if (e.target.value === 'aucune') {
                        setSelectedDates([]);
                      } else {
                        setSelectedDates([e.target.value]);
                      }
                    }}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  >
                    <option value="toutes">Tous les jours</option>
                    <option value="aucune">Aucun jour spécifique</option>
                    {dates.map(date => (
                      <option key={date} value={date}>
                        {new Date(date).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Thématiques
                  </label>
                  <select
                    value={selectedCategorie}
                    onChange={(e) => setSelectedCategorie(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  >
                    <option value="toutes">Toutes les thématiques</option>
                    {categories.map(categorie => (
                      <option key={categorie} value={categorie}>
                        {categorie}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Locaux
                  </label>
                  <select
                    value="toutes"
                    onChange={(e) => {
                      if (e.target.value === 'toutes') {
                        setSelectedLocations(locations);
                      } else {
                        setSelectedLocations(e.target.value ? [e.target.value] : []);
                      }
                    }}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  >
                    <option value="toutes">Tous les locaux</option>
                    {locations.map(location => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    {selectedEleves.length === sortedElevesDisponibles.filter(e => !isTimeSlotBusy(e)).length && sortedElevesDisponibles.length > 0
                      ? 'Tout désélectionner'
                      : 'Tout sélectionner'}
                  </button>
                  <div className="text-xs text-gray-500">
                    <span className="text-red-600 mr-2">● Créneaux occupés</span>
                    <span className="text-green-600">● Disponibles</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                        <input
                          type="checkbox"
                          checked={selectedEleves.length === sortedElevesDisponibles.filter(e => !isTimeSlotBusy(e)).length && sortedElevesDisponibles.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Heure
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Élève
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Classe
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Guide
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Thématique
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Local
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Problématique
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedElevesDisponibles.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
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
                            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                              {eleve.nom} {eleve.prenom}
                            </td>
                            <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {eleve.guide_prenom} {eleve.guide_nom}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs whitespace-nowrap">
                                {eleve.categorie || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {eleve.localisation_defense || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm max-w-xs">
                              <div className="whitespace-pre-wrap max-h-24 overflow-y-auto pr-2 text-xs">
                                {eleve.problematique || '-'}
                              </div>
                            </td>
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
                <CalendarDisplay
                  eleves={sortedElevesDisponibles}
                  selectedCategory={selectedCategorie}
                  selectedDates={selectedDates}
                  selectedLocations={selectedLocations}
                  onEventClick={handleCalendarEventClick}
                  selectedEventIds={selectedEleves}
                  busyEventIds={Array.from(busySlots).map(slot => {
                    const [date, time] = slot.split('_');
                    const eleve = elevesDisponibles.find(e => 
                      e.date_defense === date && 
                      e.heure_defense?.startsWith(time)
                    );
                    return eleve?.id || '';
                  }).filter(id => id)}
                  userLecteurExterneId={userLecteurExterneId}
                />
              </div>
            </div>
          )}
        </div>
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
            <p className="text-gray-600 mt-1">Connecté en tant que {userName}</p>
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Élève</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thématique</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guide</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lecteur interne</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médiateur</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
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
                          {eleve.guide_prenom} {eleve.guide_nom}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {eleve.lecteur_interne_prenom} {eleve.lecteur_interne_nom}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {eleve.mediateur_prenom} {eleve.mediateur_nom}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-md">
                          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                            {eleve.problematique || '-'}
                          </div>
                        </td>
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
      </div>
    </div>
  );
}
