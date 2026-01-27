'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import CalendarDisplay from '@/app/components/CalendarDisplay';
import StatsModal from '@/app/components/StatsModal';
import { 
  Menu, X, ChevronLeft, ChevronRight, LogOut, Users, 
  Calendar, Settings, FileText, BarChart, Shield, 
  UserCheck, Eye, Info, Save, RefreshCw, Plus
} from 'lucide-react';

// ========== INTERFACES EXISTANTES (COPIER-COLLER) ==========
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

interface Guide {
  id: string;
  nom: string;
  prenom: string; 
  initiale: string;
}

interface LecteurExterne {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Mediateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Coordinateur {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
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
  role?: 'guide' | 'lecteur_interne';
}

interface StatsData {
  totalEleves: number;
  avecThematique: number;
  avecProblematique: number;
  avecSources: number;
  avecGuide: number;
  avecLecteurInterne: number;
  avecLecteurExterne: number;
  pourcentageThematique: number;
  pourcentageProblematique: number;
  pourcentageSources: number;
  pourcentageGuide: number;
  pourcentageLecteurInterne: number;
  pourcentageLecteurExterne: number;
}

interface GuideStats {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  elevesGuides: number;
  elevesLecteurInterne: number;
  convocationsMarsRendues: number;
  convocationsAvrilRendues: number;
  pourcentageConvocationsMars: number;
  pourcentageConvocationsAvril: number;
}

interface DayDefenses {
  date: string;
  displayDate: string;
  locations: string[];
  defenses: DefenseEvent[];
}

interface Conflict {
  type: 'guide' | 'lecteur_interne' | 'lecteur_externe' | 'mediateur' | 'local';
  personOrLocation: string;
  conflictingDefenses: DefenseEvent[];
  message: string;
}

interface ToggleSettingProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSetting = ({ label, checked, onChange }: ToggleSettingProps) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-green-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

interface ConflictDisplayProps {
  conflicts: Conflict[];
}

const ConflictDisplay = ({ conflicts }: ConflictDisplayProps) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-red-100 p-2 rounded-full">
          <span className="text-red-600 font-bold">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-red-800">
          Conflits détectés dans le planning
        </h3>
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
          {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <div 
            key={index} 
            className="bg-white border border-red-100 rounded-lg p-4 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                conflict.type === 'local' ? 'bg-purple-100 text-purple-600' :
                conflict.type === 'guide' ? 'bg-blue-100 text-blue-600' :
                'bg-yellow-100 text-yellow-600'
              }`}>
                {conflict.type === 'local' ? '📍' : '🧑‍🏫'}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">
                  {conflict.message}
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {conflict.conflictingDefenses.map((defense, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {defense.date} {defense.startTime}
                      </span>
                      <span className="font-medium">
                        {defense.elevePrenom} {defense.eleveNom}
                      </span>
                      <span className="text-gray-500">
                        • Local: {defense.location}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-red-200">
        <p className="text-sm text-red-700">
          <strong>Action requise :</strong> Ajustez les horaires ou les affectations pour résoudre ces conflits.
        </p>
      </div>
    </div>
  );
};

type TabType = 'dashboard' | 'convocations' | 'defenses' | 'gestion-utilisateurs' | 'calendrier' | 'parametres-affichage' | 'stats' | 'controle';
type UserType = 'eleves' | 'guides' | 'lecteurs-externes' | 'mediateurs' | 'coordinateurs';

// ========== COMPOSANT PRINCIPAL ==========
export default function CoordinateurDashboard() {
  // ========== ÉTATS EXISTANTS (COPIER-COLLER) ==========
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [coordinateurs, setCoordinateurs] = useState<Coordinateur[]>([]);
  const [filteredEleves, setFilteredEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showConvoques, setShowConvoques] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [hasShownOrientationWarning, setHasShownOrientationWarning] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasShownOrientationWarning') === 'true';
    }
    return false;
  });  
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [editingModeConvocations, setEditingModeConvocations] = useState(false);
  const [editingModeDefenses, setEditingModeDefenses] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<UserType>('eleves');
  const [newUser, setNewUser] = useState({
    nom: '',
    prenom: '',
    classe: '',
    initiale: '',
    categorie: '',
    email: ''
  });
  const [showMassImport, setShowMassImport] = useState(false);
  const [massImportData, setMassImportData] = useState<string>('');
  const [showClearConfirmations, setShowClearConfirmations] = useState(false);
  const [clearConfirmations, setClearConfirmations] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('toutes');
  const [dayDefenses, setDayDefenses] = useState<DayDefenses[]>([]);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [guideStats, setGuideStats] = useState<GuideStats[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof GuideStats; direction: 'asc' | 'desc' } | null>(null);
  
  const [displaySettings, setDisplaySettings] = useState({
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

	const [expandedSections, setExpandedSections] = useState({
    fonctionnels: true,
    affichage: false,
    annee: false
  });
  
  const [journeesTFH, setJourneesTFH] = useState<Array<{
    id: number;
    date: string;
    libelle: string;
  }>>([]);
  
  const [loadingJournees, setLoadingJournees] = useState(false);
  
  const router = useRouter();
  
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    missingField: '',
  });

	const CONVOCATION_OPTIONS = [
	  { value: '', label: '-', color: 'bg-gray-100' },
	  { value: 'non_objectifs_atteints', label: 'Non, l\'élève atteint bien les objectifs', color: 'bg-green-100 text-green-800' },
	  { value: 'oui_objectifs_non_atteints', label: 'Oui, l\'élève n\'atteint pas les objectifs', color: 'bg-yellow-100 text-yellow-800' },
	  { value: 'oui_pas_avance', label: 'Oui, l\'élève n\'a pas avancé', color: 'bg-red-100 text-red-800' },
	  { value: 'oui_pas_communique', label: 'Oui, l\'élève n\'a pas communiqué', color: 'bg-orange-100 text-orange-800' },
	];
	
	const cyclePresenceState = (current: boolean | null): boolean | null => {
	  if (current === null) return true;
	  if (current === true) return false;
	  return null;
	};

  const [lecteurInterneEnabled, setLecteurInterneEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  // ========== NOUVEAUX ÉTATS POUR LE MENU ==========
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ========== DÉFINITION DES ONGLETS ==========
  const tabs = [
    {
      id: 'dashboard' as TabType,
      name: 'Tableau de bord',
      icon: <Shield className="w-5 h-5" />,
      description: 'Vue d\'ensemble',
      color: 'blue',
      showCount: false
    },
    {
      id: 'convocations' as TabType,
      name: 'Convocations',
      icon: <FileText className="w-5 h-5" />,
      description: 'Gestion des convocations',
      color: 'purple',
      showCount: true,
      count: filteredEleves.length
    },
    {
      id: 'defenses' as TabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      description: 'Planification',
      color: 'green',
      showCount: true,
      count: eleves.filter(e => e.date_defense).length
    },
    {
      id: 'calendrier' as TabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      description: 'Planning & conflits',
      color: 'orange',
      showCount: false
    },
    {
      id: 'gestion-utilisateurs' as TabType,
      name: 'Utilisateurs',
      icon: <Users className="w-5 h-5" />,
      description: 'Gestion des comptes',
      color: 'indigo',
      showCount: true,
      count: eleves.length + guides.length
    },
    {
      id: 'parametres-affichage' as TabType,
      name: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      description: 'Configuration',
      color: 'gray',
      showCount: false
    },
    {
      id: 'stats' as TabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      description: 'Analyses',
      color: 'emerald',
      showCount: false
    },
    {
      id: 'controle' as TabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      description: 'Suivi des guides',
      color: 'red',
      showCount: true,
      count: guides.length
    }
  ];
  
  	useEffect(() => {
	  const userType = localStorage.getItem('userType');
	  const name = localStorage.getItem('userName');
	  
	  if (userType !== 'coordinateur') {
	    router.push('/');
	    return;
	  }
	  
	  setUserName(name || '');
	  loadData();
	  loadSystemSettings();
	  loadDisplaySettings();
	
	  // Vérification simple pour le message paysage
	  const checkAndShowMessage = () => {
	    if (typeof window === 'undefined') return;
	    
	    const isMobile = window.innerWidth <= 768;
	    const isPortrait = window.innerHeight > window.innerWidth;
	    
	    if (isMobile && isPortrait) {
	      const msg = document.getElementById('landscape-message');
	      if (msg) {
	        msg.style.display = 'flex';
	      }
	    }
	  };
	
	  // Attendre que la page soit complètement chargée
	  if (document.readyState === 'complete') {
	    checkAndShowMessage();
	  } else {
	    window.addEventListener('load', checkAndShowMessage);
	  }
	
	}, [router]);
	
	
	useEffect(() => {
	  if (activeTab === 'stats') {
	    loadStats();
	  } else if (activeTab === 'controle') {
	    loadGuideStats();
	  }
	}, [activeTab]);

	// Effet pour détecter automatiquement les sessions quand les dates changent
	useEffect(() => {
	  // Cette fonction sera exécutée à chaque changement de journeesTFH
	  // Vous pouvez l'utiliser pour loguer ou faire d'autres traitements
	  const sessions = detecterSessions();
	  console.log('Sessions détectées:', sessions);
	}, [journeesTFH, detecterSessions]);	
	
  const pluralize = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };
  
  const loadData = async () => {
    try {
      // Charger les guides triés par nom
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides')
        .select('id, nom, prenom, initiale')
        .order('nom', { ascending: true });
      
      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // Charger les lecteurs externes
      const { data: lecteursExternesData, error: lecteursError } = await supabase
        .from('lecteurs_externes')
        .select('id, nom, prenom, email');

      if (lecteursError) throw lecteursError;
      setLecteursExternes(lecteursExternesData || []);

      // Charger les médiateurs
      const { data: mediateursData, error: mediateursError } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom, email');

      if (mediateursError) {
        setMediateurs([]);
      } else {
        setMediateurs(mediateursData || []);
      }

      // Charger les coordinateurs
      const { data: coordinateursData, error: coordinateursError } = await supabase
        .from('coordinateurs')
        .select('id, nom, prenom, initiale');

      if (coordinateursError) {
        setCoordinateurs([]);
      } else {
        setCoordinateurs(coordinateursData || []);
      }

      // Charger les élèves avec toutes les données
      const { data: elevesData, error: elevesError } = await supabase
	      .from('eleves')
	      .select(`
	        *,
	        guide:guides!guide_id (nom, prenom),
	        lecteur_interne:guides!lecteur_interne_id (nom, prenom),
	        lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
	        mediateur:mediateurs!mediateur_id (nom, prenom)
	      `)
	      .order('classe', { ascending: true })
	      .order('nom', { ascending: true });
	
	    if (elevesError) throw elevesError;
	
	    
	    // Vérifier les données d'un élève spécifique
	    if (elevesData && elevesData.length > 0) {
	      const testEleve = elevesData[0];
	    }

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
			
			// FORCER une nouvelle référence
			setEleves([...elevesFormatted]);
			setFilteredEleves([...elevesFormatted]);

      // Extraire les catégories uniques
      const uniqueCategories = Array.from(
        new Set(elevesFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

	const loadStats = async () => {
	  try {
	    const { data: eleves, error } = await supabase
	      .from('eleves')
	      .select('*');
	    
	    if (error) throw error;
	
	    const totalEleves = eleves.length;
	    
	    // Calculer les statistiques
	    const avecThematique = eleves.filter(e => e.thematique && e.thematique.trim() !== '').length;
	    const avecProblematique = eleves.filter(e => e.problematique && e.problematique.trim() !== '').length;
	    const avecSources = eleves.filter(e => 
	      e.source_1 && e.source_1.trim() !== '' &&
	      e.source_2 && e.source_2.trim() !== '' &&
	      e.source_3 && e.source_3.trim() !== '' &&
	      e.source_4 && e.source_4.trim() !== '' &&
	      e.source_5 && e.source_5.trim() !== ''
	    ).length;
	    const avecGuide = eleves.filter(e => e.guide_id).length;
	    const avecLecteurInterne = eleves.filter(e => e.lecteur_interne_id).length;
	    const avecLecteurExterne = eleves.filter(e => e.lecteur_externe_id).length;
	
	    setStats({
	      totalEleves,
	      avecThematique,
	      avecProblematique,
	      avecSources,
	      avecGuide,
	      avecLecteurInterne,
	      avecLecteurExterne,
	      pourcentageThematique: totalEleves > 0 ? (avecThematique / totalEleves) * 100 : 0,
	      pourcentageProblematique: totalEleves > 0 ? (avecProblematique / totalEleves) * 100 : 0,
	      pourcentageSources: totalEleves > 0 ? (avecSources / totalEleves) * 100 : 0,
	      pourcentageGuide: totalEleves > 0 ? (avecGuide / totalEleves) * 100 : 0,
	      pourcentageLecteurInterne: totalEleves > 0 ? (avecLecteurInterne / totalEleves) * 100 : 0,
	      pourcentageLecteurExterne: totalEleves > 0 ? (avecLecteurExterne / totalEleves) * 100 : 0,
	    });
	
	  } catch (err) {
	    console.error('Erreur chargement stats:', err);
	  }
	};
	
	const loadGuideStats = async () => {
	  try {
	    // Charger tous les guides
	    const { data: guides, error: guidesError } = await supabase
	      .from('guides')
	      .select('*');
	    
	    if (guidesError) throw guidesError;
	
	    // Charger tous les élèves
	    const { data: eleves, error: elevesError } = await supabase
	      .from('eleves')
	      .select('*');
	    
	    if (elevesError) throw elevesError;
	
	    // Calculer les stats pour chaque guide
	    const stats = guides.map(guide => {
	      const elevesDuGuide = eleves.filter(e => e.guide_id === guide.id);
	      const elevesLecteurInterne = eleves.filter(e => e.lecteur_interne_id === guide.id);
	      
	      const convocationsMarsRendues = elevesDuGuide.filter(e => 
	        e.convocation_mars && e.convocation_mars.trim() !== ''
	      ).length;
	      
	      const convocationsAvrilRendues = elevesDuGuide.filter(e => 
	        e.convocation_avril && e.convocation_avril.trim() !== ''
	      ).length;
	
	      return {
	        id: guide.id,
	        nom: guide.nom,
	        prenom: guide.prenom,
	        initiale: guide.initiale,
	        elevesGuides: elevesDuGuide.length,
	        elevesLecteurInterne: elevesLecteurInterne.length,
	        convocationsMarsRendues,
	        convocationsAvrilRendues,
	        pourcentageConvocationsMars: elevesDuGuide.length > 0 ? 
	          (convocationsMarsRendues / elevesDuGuide.length) * 100 : 0,
	        pourcentageConvocationsAvril: elevesDuGuide.length > 0 ? 
	          (convocationsAvrilRendues / elevesDuGuide.length) * 100 : 0,
	      };
	    });
	
	    setGuideStats(stats);
	  } catch (err) {
	    console.error('Erreur chargement stats guides:', err);
	  }
	};
	
	
	// Fonction pour ouvrir le modal
	function openModal(title: string, missingField: string) {
	  setModal({
	    isOpen: true,
	    title,
	    missingField,
	  });
	}
	
	const handleSort = (key: keyof GuideStats) => {
	  let direction: 'asc' | 'desc' = 'asc';
	  
	  if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
	    direction = 'desc';
	  }
	  
	  setSortConfig({ key, direction });
	  
	  const sortedData = [...guideStats].sort((a, b) => {
	    if (a[key] < b[key]) {
	      return direction === 'asc' ? -1 : 1;
	    }
	    if (a[key] > b[key]) {
	      return direction === 'asc' ? 1 : -1;
	    }
	    return 0;
	  });
	  
	  setGuideStats(sortedData);
	};
	
	const getSortIcon = (key: keyof GuideStats) => {
	  if (!sortConfig || sortConfig.key !== key) return '⇅';
	  return sortConfig.direction === 'asc' ? '↑' : '↓';
	};



  const handlePresenceUpdate = async (eleveId: string, field: string, currentValue: boolean | null) => {
    if (!editingModeConvocations) return;
    
    try {
      const newValue = cyclePresenceState(currentValue);
      
      const updateData: any = {};
      updateData[field] = newValue;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;

      const updatedEleves = eleves.map(eleve => 
			  eleve.id === eleveId ? { ...eleve, [field]: newValue } : eleve
			);
			
			setEleves([...updatedEleves]);
			setFilteredEleves([...updatedEleves]);
		} catch (err) {
      console.error('Erreur mise à jour présence:', err);
      loadData();
    }
  };

	const handleUpdate = async (eleveId: string, field: string, value: string) => {
	  const isEditing = activeTab === 'convocations' ? editingModeConvocations : editingModeDefenses;
	  if (!isEditing) return;
	  
	  try {
	    const updateData: any = {};
	    updateData[field] = value === '' ? null : value;
	
	    // 1. Mise à jour IMMÉDIATE de l'état local
	    const updatedEleves = eleves.map(eleve => 
	      eleve.id === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
	    );
	    
	    // Créer une NOUVELLE référence
	    setEleves([...updatedEleves]);
	    setFilteredEleves([...updatedEleves]);
	
	    // 2. Mettre à jour dans Supabase
	    const { error } = await supabase
	      .from('eleves')
	      .update(updateData)
	      .eq('id', eleveId);
	
	    if (error) throw error;
	
	
	    // 3. Vérifier si c'est un champ qui affecte le calendrier
	    const isDefenseField = field.includes('date_defense') || 
	                          field.includes('heure_defense') || 
	                          field.includes('localisation_defense') ||
	                          field.includes('guide_id') ||
	                          field.includes('lecteur_interne_id') ||
	                          field.includes('lecteur_externe_id') ||
	                          field.includes('mediateur_id');
	
	    if (isDefenseField) {
	      setCalendarRefreshTrigger(prev => prev + 1);
	    }
	    
	    setEditingCell(null);
	    
	  } catch (err) {
	    console.error('❌ Erreur mise à jour:', err);
	    alert('Erreur lors de la mise à jour: ' + (err as Error).message);
	    // Recharger les données pour récupérer l'état correct
	    loadData();
	  }
	};


	const handleSelectUpdate = async (eleveId: string, field: string, value: string) => {
	  const isEditing = activeTab === 'convocations' ? editingModeConvocations : editingModeDefenses;
	  if (!isEditing) return;
	  
	  try {
	    const updateData: any = {};
	    updateData[field] = value === '' ? null : value;
	
	    // 1. Mise à jour IMMÉDIATE de l'état local
	    const updatedEleves = eleves.map(eleve => 
	      eleve.id === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
	    );
	    
	    // Créer une NOUVELLE référence
	    setEleves([...updatedEleves]);
	    setFilteredEleves([...updatedEleves]);
	
	    // 2. Mettre à jour dans Supabase
	    const { error } = await supabase
	      .from('eleves')
	      .update(updateData)
	      .eq('id', eleveId);
	
	    if (error) throw error;
	
	
	    // 3. TOUJOURS rafraîchir le calendrier pour ces champs
	    setCalendarRefreshTrigger(prev => prev + 1);
	    
	  } catch (err) {
	    console.error('Erreur mise à jour select:', err);
	    loadData();
	  }
	};
	
		// Fonction pour charger le paramètre
	const loadSystemSettings = async () => {
	  try {
	    const { data, error } = await supabase
	      .from('system_settings')
	      .select('*')
	      .eq('setting_key', 'guide_lecteur_interne_enabled')
	      .single();
	    
	    if (!error && data) {
	      setLecteurInterneEnabled(data.setting_value === 'true');
	    }
	  } catch (err) {
	    console.error('Erreur chargement paramètres:', err);
	  }
	};
	
	
	const loadDisplaySettings = async () => {
	  try {
	    const { data, error } = await supabase
	      .from('system_settings')
	      .select('*');
	    
	    if (error) throw error;
	    
	    if (data) {
	      const settings: any = {};
	      data.forEach(setting => {
	        settings[setting.setting_key] = setting.setting_value === 'true';
	      });
	      setDisplaySettings(prev => ({ ...prev, ...settings }));
	    }
	  } catch (err) {
	    console.error('Erreur chargement paramètres affichage:', err);
	  }
	};

	  // Fonction pour charger les journées TFH
  const loadJourneesTFH = useCallback(async () => {
    setLoadingJournees(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .like('setting_key', 'Journee_%')
        .order('setting_key');
      
      if (error) throw error;
      
      // Transformer les données
      const journees = Array.from({ length: 10 }, (_, i) => {
        const journeeData = data?.find(d => d.setting_key === `Journee_${i + 1}`);
        if (journeeData) {
          return {
            id: i + 1,
            date: journeeData.setting_value || '',
            libelle: journeeData.description || `Journée ${i + 1}`
          };
        }
        return {
          id: i + 1,
          date: '',
          libelle: `Journée ${i + 1}`
        };
      });
      
      setJourneesTFH(journees);
    } catch (err) {
      console.error('Erreur chargement journées TFH:', err);
    } finally {
      setLoadingJournees(false);
    }
  }, []);

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
	
	// Fonction pour déterminer la couleur basée sur la session
	const getSessionColor = useCallback((journee: { id: number; date: string }) => {
	  if (!journee.date) return 'bg-white';
	  
	  const sessions = detecterSessions();
	  const sessionId = sessions[journee.id];
	  
	  if (!sessionId) return 'bg-white';
	  
	  // Couleurs différentes pour chaque session
	  const couleursSession = [
	    'bg-blue-50',  // Session 1
	    'bg-green-50', // Session 2
	    'bg-purple-50', // Session 3
	    'bg-yellow-50', // Session 4
	    'bg-pink-50',  // Session 5
	    'bg-indigo-50', // Session 6
	  ];
	  
	  const couleurIndex = (sessionId - 1) % couleursSession.length;
	  return couleursSession[couleurIndex];
	}, [detecterSessions]);
	
	// Fonction pour obtenir le nom de la session
	const getSessionName = useCallback((journeeId: number) => {
	  const sessions = detecterSessions();
	  const sessionId = sessions[journeeId];
	  
	  if (!sessionId) return '';
	  
	  const nomsSession = [
	    'Session 1',
	    'Session 2',
	    'Session 3',
	    'Session 4',
	    'Session 5',
	    'Session 6',
	  ];
	  
	  const nomIndex = (sessionId - 1) % nomsSession.length;
	  return nomsSession[nomIndex];
	}, [detecterSessions]);

  // Fonctions de sauvegarde (à ajouter aussi)
  const saveJourneeDate = async (journeeId: number, date: string) => {
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
      alert(`Date de la journée ${journeeId} sauvegardée`);
    } catch (err) {
      console.error('Erreur sauvegarde journée:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const saveAllJournees = async () => {
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
      alert('Toutes les dates ont été sauvegardées !');
    } catch (err) {
      console.error('Erreur sauvegarde globale:', err);
      alert('Erreur lors de la sauvegarde globale');
    }
  };

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
	  } catch (err) {
	    console.error('Erreur sauvegarde paramètre:', err);
	    alert('Erreur lors de la sauvegarde du paramètre');
	  }
	};


	const getSettingDescription = (key: string): string => {
	  const descriptions: Record<string, string> = {
	    // Paramètres fonctionnels
	    'guide_lecteur_interne_enabled': 'Autoriser les guides à sélectionner des TFH en tant que lecteur interne',
	    
	    // Vue Lecteur Externe
	    'lecteur_externe_voir_eleves': 'Les lecteurs externes voient-ils les noms/prénoms des élèves ?',
	    'lecteur_externe_voir_guides': 'Les lecteurs externes voient-ils les noms/prénoms des guides ?',
	    'lecteur_externe_voir_lecteurs_internes': 'Les lecteurs externes voient-ils les noms/prénoms des lecteurs internes ?',
	    'lecteur_externe_voir_mediateurs': 'Les lecteurs externes voient-ils les noms/prénoms des médiateurs ?',
	    
	    // Vue Lecteur Interne
	    'lecteur_interne_voir_eleves': 'Les lecteurs internes voient-ils les noms/prénoms des élèves ?',
	    'lecteur_interne_voir_guides': 'Les lecteurs internes voient-ils les noms/prénoms des guides ?',
	    'lecteur_interne_voir_lecteurs_externes': 'Les lecteurs internes voient-ils les noms/prénoms des lecteurs externes ?',
	    'lecteur_interne_voir_mediateurs': 'Les lecteurs internes voient-ils les noms/prénoms des médiateurs ?',
	    
	    // Vue Médiateur
	    'mediateur_voir_eleves': 'Les médiateurs voient-ils les noms/prénoms des élèves ?',
	    'mediateur_voir_guides': 'Les médiateurs voient-ils les noms/prénoms des guides ?',
	    'mediateur_voir_lecteurs_internes': 'Les médiateurs voient-ils les noms/prénoms des lecteurs internes ?',
	    'mediateur_voir_lecteurs_externes': 'Les médiateurs voient-ils les noms/prénoms des lecteurs externes ?',
	  };
	  
	  return descriptions[key] || 'Paramètre d\'affichage';
	};

	// Fonction pour mettre à jour le paramètre
	const toggleLecteurInterne = async (enabled: boolean) => {
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
	    alert(`Onglet "Lecteur interne" ${enabled ? 'activé' : 'désactivé'} pour les guides.`);
	  } catch (err) {
	    console.error('Erreur mise à jour paramètre:', err);
	    alert('Erreur lors de la mise à jour');
	  }
	};
	
	
  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories(prev => [...prev, newCategory.trim()].sort());
      setNewCategory('');
    }
  };

  const handleAddUser = async () => {
    try {
      // Vérifier les champs requis
      if (!newUser.nom.trim()) {
        alert('Le nom est requis');
        return;
      }
  
      if (!newUser.prenom.trim() && selectedUserType !== 'guides' && selectedUserType !== 'coordinateurs') {
        alert('Le prénom est requis');
        return;
      }
  
      switch (selectedUserType) {
        case 'eleves':
          if (!newUser.classe.trim()) {
            alert('La classe est requise pour un élève');
            return;
          }
          
          const initialeEleve = newUser.prenom.trim().charAt(0).toUpperCase();
          
          const { error: eleveError } = await supabase
            .from('eleves')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              classe: newUser.classe,
              categorie: newUser.categorie || null,
              initiale: initialeEleve,
              guide_id: null
            }]);
  
          if (eleveError) throw eleveError;
          break;
  
        case 'guides':
          if (!newUser.prenom.trim()) {
            alert('Le prénom est requis pour un guide');
            return;
          }
          
          const initialeGuide = newUser.prenom.trim().charAt(0).toUpperCase();
          
          const { error: guideError } = await supabase
            .from('guides')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              initiale: initialeGuide,
              email: newUser.email || null
            }]);
  
          if (guideError) throw guideError;
          break;
  
        case 'lecteurs-externes':
          if (!newUser.prenom.trim()) {
            alert('Le prénom est requis pour un lecteur externe');
            return;
          }
          
          const { error: lecteurError } = await supabase
            .from('lecteurs_externes')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || null
            }]);
  
          if (lecteurError) throw lecteurError;
          break;
  
        case 'mediateurs':
          if (!newUser.prenom.trim()) {
            alert('Le prénom est requis pour un médiateur');
            return;
          }
          
          const { error: mediateurError } = await supabase
            .from('mediateurs')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || null
            }]);
  
          if (mediateurError) throw mediateurError;
          break;
  
        case 'coordinateurs':
          if (!newUser.prenom.trim()) {
            alert('Le prénom est requis pour un coordinateur');
            return;
          }
          
          const initialeCoord = newUser.prenom.trim().charAt(0).toUpperCase();
          
          const { error: coordError } = await supabase
            .from('coordinateurs')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              initiale: initialeCoord
            }]);
  
          if (coordError) {
            console.error('Erreur détaillée coordinateur:', coordError);
            throw coordError;
          }
          break;
      }
  
      alert('Utilisateur ajouté avec succès!');
      // Réinitialiser le formulaire
      setNewUser({
        nom: '',
        prenom: '',
        classe: '',
        email: '',
        initiale: '',
        categorie: ''
      });
      loadData();
    } catch (err) {
      console.error('Erreur ajout utilisateur:', err);
      alert('Erreur lors de l\'ajout de l\'utilisateur: ' + (err as Error).message);
    }
  };  
	
  const handleDeleteUser = async (id: string, nom: string, prenom?: string) => {
    const fullName = prenom ? `${prenom} ${nom}` : nom;
    
    if (confirm(`Supprimer ${fullName} ?`)) {
      try {
        switch (selectedUserType) {
          case 'eleves':
            await supabase.from('eleves').delete().eq('id', id);
            break;
          case 'guides':
            await supabase.from('guides').delete().eq('id', id);
            break;
          case 'lecteurs-externes':
            await supabase.from('lecteurs_externes').delete().eq('id', id);
            break;
          case 'mediateurs':
            await supabase.from('mediateurs').delete().eq('id', id);
            break;
          case 'coordinateurs':
            await supabase.from('coordinateurs').delete().eq('id', id);
            break;
        }

        alert('Utilisateur supprimé avec succès!');
        loadData();
      } catch (err) {
        console.error('Erreur suppression utilisateur:', err);
        alert('Erreur lors de la suppression de l\'utilisateur');
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        // Convertir en format CSV pour l'affichage
        const csvText = jsonData.map(row => row.join(',')).join('\n');
        setMassImportData(csvText);
        setShowMassImport(true);
      } catch (err) {
        console.error('Erreur lecture fichier:', err);
        alert('Erreur lors de la lecture du fichier');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMassImport = async () => {
    try {
      const rows = massImportData.trim().split('\n').filter(row => row.trim());
      if (rows.length === 0) {
        alert('Aucune donnée à importer');
        return;
      }
  
      // Vérifier si la première ligne contient des en-têtes
      const firstRow = rows[0].split(',').map(c => c.trim().toLowerCase());
      const hasHeaders = firstRow.includes('nom') || firstRow.includes('prenom') || firstRow.includes('classe');
      
      const dataRows = hasHeaders ? rows.slice(1) : rows;
      
      console.log(`Import de ${dataRows.length} utilisateurs...`);
  
      switch (selectedUserType) {
        case 'eleves':
          const elevesToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const eleve: any = {
              nom: values[0] || '',
              prenom: values[1] || '',
              classe: values[2] || '',
              initiale: (values[1] || '').charAt(0).toUpperCase(),
              categorie: values[3] || null,
              guide_id: null
            };
            return eleve;
          }).filter(e => e.nom && e.prenom && e.classe);
  
          if (elevesToInsert.length > 0) {
            const { error } = await supabase
              .from('eleves')
              .insert(elevesToInsert);
            if (error) throw error;
          }
          break;
  
          // Dans handleMassImport() - section pour les guides (~ligne 505)
          case 'guides':
            const guidesToInsert = dataRows.map(row => {
              const values = row.split(',').map(v => v.trim());
              const guideData: any = {
                nom: values[0] || '',
                prenom: values[1] || '',
                initiale: (values[1] || '').charAt(0).toUpperCase()
              };
              return guideData;
            }).filter(g => g.nom && g.prenom);
          
            // ← IL MANQUE LA PARTIE D'INSERTION !
            if (guidesToInsert.length > 0) {
              const { error } = await supabase
                .from('guides')
                .insert(guidesToInsert);
              if (error) throw error;
            }
            break; // ← Ajouter break
  
        case 'lecteurs-externes':
          const lecteursToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            return {
              nom: values[0] || '',
              prenom: values[1] || '',
              email: values[2] || null
            };
          }).filter(l => l.nom && l.prenom);
  
          if (lecteursToInsert.length > 0) {
            const { error } = await supabase
              .from('lecteurs_externes')
              .insert(lecteursToInsert);
            if (error) throw error;
          }
          break;
  
        case 'mediateurs':
          const mediateursToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            return {
              nom: values[0] || '',
              prenom: values[1] || '',
              email: values[2] || null
            };
          }).filter(m => m.nom && m.prenom);
  
          if (mediateursToInsert.length > 0) {
            const { error } = await supabase
              .from('mediateurs')
              .insert(mediateursToInsert);
            if (error) throw error;
          }
          break;
  
        // Dans handleMassImport() - section pour les coordinateurs (~ligne 570)
        case 'coordinateurs':
          const coordinateursToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const coordData: any = {
              nom: values[0] || '',
              prenom: values[1] || ''
            };
            
            // Calculer l'initiale automatiquement
            if (values[1]) {
              coordData.initiale = values[1].charAt(0).toUpperCase();
            }
            
            return coordData;
          }).filter(c => c.nom && c.prenom);
        
          // ← IL MANQUE LA PARTIE D'INSERTION !
          if (coordinateursToInsert.length > 0) {
            const { error } = await supabase
              .from('coordinateurs')
              .insert(coordinateursToInsert);
            if (error) throw error;
          }
          break; 
      }
  
      alert(`${dataRows.length} utilisateur${dataRows.length > 1 ? 's' : ''} importé${dataRows.length > 1 ? 's' : ''} avec succès!`);
      setShowMassImport(false);
      setMassImportData('');
      loadData();
    } catch (err) {
      console.error('Erreur import massif:', err);
      alert('Erreur lors de l\'importation: ' + (err as Error).message);
    }
  };

  const handleClearAll = async (type: 'eleves' | 'guides') => {
    if (!clearConfirmations.includes(userName)) {
      setClearConfirmations([...clearConfirmations, userName]);
      alert(`Confirmation 1/3 enregistrée. Demandez à 2 autres coordinateurs de confirmer.`);
      return;
    }

    if (clearConfirmations.length < 2) {
      alert(`Confirmation ${clearConfirmations.length}/3 enregistrée. ${3 - clearConfirmations.length} confirmation(s) restante(s).`);
      return;
    }

    // 3 confirmations reçues
    try {
      if (type === 'eleves') {
        const { error } = await supabase
          .from('eleves')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) throw error;
      } else if (type === 'guides') {
        const { error } = await supabase
          .from('guides')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }

      alert(`Tous les ${type} ont été supprimés avec succès!`);
      setShowClearConfirmations(false);
      setClearConfirmations([]);
      loadData();
    } catch (err) {
      console.error(`Erreur suppression ${type}:`, err);
      alert(`Erreur lors de la suppression des ${type}`);
    }
  };

  const getCurrentUsers = () => {
    console.log('Type sélectionné:', selectedUserType);
    console.log('Élèves:', eleves.length);
    console.log('Guides:', guides.length);
    
    switch (selectedUserType) {
      case 'eleves':
        return eleves;
      case 'guides':
        return guides;
      case 'lecteurs-externes':
        return lecteursExternes;
      case 'mediateurs':
        return mediateurs;
      case 'coordinateurs':
        return coordinateurs;
      default:
        return [];
    }
  };

  const getCurrentUserCount = () => {
    const users = getCurrentUsers();
    return users.length;
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

  const getCategoryColor = (categorie: string) => {
    const colors = [
      { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' }, // Bleu clair
      { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' }, // Jaune/Orange
      { bg: '#D1FAE5', border: '#34D399', text: '#065F46' }, // Vert clair
      { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' }, // Rose
      { bg: '#E0E7FF', border: '#A5B4FC', text: '#3730A3' }, // Indigo
      { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' }, // Jaune vif
      { bg: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E' }, // Cyan
      { bg: '#F3E8FF', border: '#D8B4FE', text: '#6B21A8' }, // Violet
      { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' }, // Rouge
      { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' }, // Vert émeraude
      { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' }, // Jaune ambre
      { bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' }, // Violet foncé
      { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' }, // Rose fushia
      { bg: '#CCFBF1', border: '#5EEAD4', text: '#0F766E' }, // Turquoise
      { bg: '#FEFCE8', border: '#FEF08A', text: '#854D0E' }, // Jaune clair
      { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' }, // Bleu ciel
      { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' }, // Rouge clair
      { bg: '#ECFCCB', border: '#BEF264', text: '#3F6212' }, // Vert lime
      { bg: '#FAF5FF', border: '#E9D5FF', text: '#7C3AED' }, // Violet clair
      { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' }, // Orange clair
    ];
    
    // Générer un index stable basé sur la catégorie
    if (!categorie || categorie === 'Non catégorisé') {
      return { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' }; // Gris par défaut
    }
    
    const hash = categorie.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % colors.length;
    
    return colors[index];
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };
  
  
  // Fonction pour ajouter 50 minutes à une heure
  const add50Minutes = (time: string): string => {
    if (!time) return '';
    
    // time est au format "HH:MM"
    const [hours, minutes] = time.split(':').map(Number);
    let newHours = hours;
    let newMinutes = minutes + 50;
    
    if (newMinutes >= 60) {
      newHours += Math.floor(newMinutes / 60);
      newMinutes = newMinutes % 60;
    }
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

	
	const detectConflicts = (defenses: DefenseEvent[]): Conflict[] => {
	  const conflicts: Conflict[] = [];
	  
	  // 1. Grouper les défenses par date + créneau horaire pour optimisation
	  const defensesByDate = defenses.reduce((acc, defense) => {
	    const key = `${defense.date}-${defense.startTime}`;
	    if (!acc[key]) acc[key] = [];
	    acc[key].push(defense);
	    return acc;
	  }, {} as Record<string, DefenseEvent[]>);
	  
	  // 2. Fonction utilitaire pour vérifier le chevauchement
	  const hasOverlap = (d1: DefenseEvent, d2: DefenseEvent): boolean => {
	    if (d1.date !== d2.date) return false;
	    
	    // Convertir en minutes pour comparaison
	    const toMinutes = (time: string): number => {
	      const [hours, minutes] = time.split(':').map(Number);
	      return hours * 60 + minutes;
	    };
	    
	    const start1 = toMinutes(d1.startTime);
	    const end1 = toMinutes(d1.endTime);
	    const start2 = toMinutes(d2.startTime);
	    const end2 = toMinutes(d2.endTime);
	    
	    // Chevauchement si les intervalles se croisent
	    return (start1 < end2 && start2 < end1);
	  };
	  
	  // 3. Détecter les conflits pour chaque PERSONNE (peu importe son rôle)
	  const personDefensesMap = new Map<string, DefenseEvent[]>();
	  
	  // Grouper par personne (guide OU lecteur interne)
	  defenses.forEach(defense => {
	    // 1. Ajouter le guide
	    const guideKey = `${defense.guidePrenom} ${defense.guideNom}`;
	    if (guideKey.trim() !== '- -' && guideKey.trim()) {
	      if (!personDefensesMap.has(guideKey)) {
	        personDefensesMap.set(guideKey, []);
	      }
	      personDefensesMap.get(guideKey)!.push({
	        ...defense,
	        role: 'guide' as const
	      });
	    }
	    
	    // 2. Ajouter le lecteur interne (si différent du guide)
	    const lecteurInterneKey = `${defense.lecteurInternePrenom} ${defense.lecteurInterneNom}`;
	    if (lecteurInterneKey.trim() !== '- -' && lecteurInterneKey.trim() && lecteurInterneKey !== guideKey) {
	      if (!personDefensesMap.has(lecteurInterneKey)) {
	        personDefensesMap.set(lecteurInterneKey, []);
	      }
	      personDefensesMap.get(lecteurInterneKey)!.push({
	        ...defense,
	        role: 'lecteur_interne' as const
	      });
	    }
	  });
	  
	  // Vérifier les chevauchements pour chaque personne
	  personDefensesMap.forEach((personDefenses, person) => {
	    if (personDefenses.length < 2) return;
	    
	    // Trier par date et heure
	    personDefenses.sort((a, b) => {
	      if (a.date !== b.date) return a.date.localeCompare(b.date);
	      return a.startTime.localeCompare(b.startTime);
	    });
	    
	    // Vérifier les chevauchements consécutifs
	    for (let i = 0; i < personDefenses.length; i++) {
	      const current = personDefenses[i];
	      const overlapping: DefenseEvent[] = [current];
	      
	      for (let j = i + 1; j < personDefenses.length; j++) {
	        const next = personDefenses[j];
	        
	        if (hasOverlap(current, next)) {
	          overlapping.push(next);
	        } else {
	          // Pas de chevauchement, on arrête
	          break;
	        }
	      }
	      
	      if (overlapping.length >= 2) {
	        // Déterminer le type de conflit
	        const types = overlapping.map(d => {
	          const isGuide = `${d.guidePrenom} ${d.guideNom}` === person;
	          const isLecteurInterne = `${d.lecteurInternePrenom} ${d.lecteurInterneNom}` === person;
	          
	          if (isGuide && isLecteurInterne) return 'guide_et_lecteur_interne';
	          if (isGuide) return 'guide';
	          if (isLecteurInterne) return 'lecteur_interne';
	          return 'autre';
	        });
	        
	        // Créer un message adapté
	        let message = '';
	        if (types.includes('guide') && types.includes('lecteur_interne')) {
	          message = `🧑‍🏫📖 ${person} (guide & lecteur interne) a ${overlapping.length} TFH qui se chevauchent`;
	        } else if (types.includes('guide')) {
	          message = `🧑‍🏫 Guide ${person} a ${overlapping.length} TFH qui se chevauchent`;
	        } else if (types.includes('lecteur_interne')) {
	          message = `📖 Lecteur interne ${person} a ${overlapping.length} TFH qui se chevauchent`;
	        } else {
	          message = `${person} a ${overlapping.length} TFH qui se chevauchent`;
	        }
	        
	        // Éviter les doublons
	        const existingConflict = conflicts.find(c => 
	          c.personOrLocation === person &&
	          c.conflictingDefenses.length === overlapping.length &&
	          c.conflictingDefenses.every(d => overlapping.includes(d))
	        );
	        
	        if (!existingConflict) {
	          conflicts.push({
	            type: 'guide', // On utilise 'guide' comme type générique pour les personnes
	            personOrLocation: person,
	            conflictingDefenses: [...overlapping],
	            message
	          });
	          
	          // Avancer l'index i pour éviter les conflits redondants
	          i += overlapping.length - 1;
	        }
	      }
	    }
	  });
	  
	  // 4. Détecter les conflits de locaux (garder cette partie inchangée)
	  const localDefensesMap = new Map<string, DefenseEvent[]>();
	  
	  defenses.forEach(defense => {
	    if (defense.location && defense.location !== 'Non défini') {
	      if (!localDefensesMap.has(defense.location)) {
	        localDefensesMap.set(defense.location, []);
	      }
	      localDefensesMap.get(defense.location)!.push(defense);
	    }
	  });
	  
	  localDefensesMap.forEach((localDefenses, location) => {
	    if (localDefenses.length < 2) return;
	    
	    // Trier par date et heure
	    localDefenses.sort((a, b) => {
	      if (a.date !== b.date) return a.date.localeCompare(b.date);
	      return a.startTime.localeCompare(b.startTime);
	    });
	    
	    for (let i = 0; i < localDefenses.length; i++) {
	      const current = localDefenses[i];
	      const overlapping: DefenseEvent[] = [current];
	      
	      for (let j = i + 1; j < localDefenses.length; j++) {
	        const next = localDefenses[j];
	        
	        if (hasOverlap(current, next)) {
	          overlapping.push(next);
	        } else {
	          break;
	        }
	      }
	      
	      if (overlapping.length >= 2) {
	        const existingConflict = conflicts.find(c => 
	          c.type === 'local' && 
	          c.personOrLocation === location &&
	          c.conflictingDefenses.length === overlapping.length &&
	          c.conflictingDefenses.every(d => overlapping.includes(d))
	        );
	        
	        if (!existingConflict) {
	          conflicts.push({
	            type: 'local',
	            personOrLocation: location,
	            conflictingDefenses: [...overlapping],
	            message: `📍 Local "${location}" utilisé pour ${overlapping.length} TFH simultanément`
	          });
	          
	          i += overlapping.length - 1;
	        }
	      }
	    }
	  });
	  
	  // 5. Trier les conflits par gravité (nombre de défenses en conflit)
	  return conflicts.sort((a, b) => b.conflictingDefenses.length - a.conflictingDefenses.length);
	};
	
	const prepareCalendarData = useCallback(() => {
	  // Filtrer les élèves avec une date et heure de défense
	  const defensesWithSchedule = eleves.filter(e => 
	    e.date_defense && e.heure_defense
	  );
	  
	  // Transformer en DefenseEvent
	  const defenseEvents: DefenseEvent[] = defensesWithSchedule.map(eleve => {
	    const startTime = eleve.heure_defense!.substring(0, 5);
	    const endTime = add50Minutes(startTime);
	    
	    return {
	      id: eleve.id,
	      eleveId: eleve.id,
	      date: eleve.date_defense!,
	      startTime: startTime,
	      endTime: endTime,
	      location: eleve.localisation_defense || 'Non défini',
	      eleveNom: eleve.nom,
	      elevePrenom: eleve.prenom,
	      guideNom: eleve.guide_nom || '-',
	      guidePrenom: eleve.guide_prenom || '-',
	      lecteurInterneNom: eleve.lecteur_interne_nom || '-',
	      lecteurInternePrenom: eleve.lecteur_interne_prenom || '-',
	      lecteurExterneNom: eleve.lecteur_externe_nom || '-',
	      lecteurExternePrenom: eleve.lecteur_externe_prenom || '-',
	      mediateurNom: eleve.mediateur_nom || '-',
	      mediateurPrenom: eleve.mediateur_prenom || '-',
	      categorie: eleve.categorie || 'Non catégorisé'
	    };
	  });
	  
	  // Appliquer les filtres
	  let filteredDefenses = defenseEvents;
	  
	  if (selectedCategory !== 'toutes') {
	    filteredDefenses = filteredDefenses.filter(d => d.categorie === selectedCategory);
	  }
	  
	  if (selectedDates.length > 0) {
	    filteredDefenses = filteredDefenses.filter(d => selectedDates.includes(d.date));
	  }
	  
	  if (selectedLocations.length > 0) {
	    filteredDefenses = filteredDefenses.filter(d => selectedLocations.includes(d.location));
	  }
	  
	  // Détecter les conflits
	  const detectedConflicts = detectConflicts(filteredDefenses);
	  setConflicts(detectedConflicts);
	  
	  // Grouper par date
	  const dates = Array.from(new Set(filteredDefenses.map(d => d.date))).sort();
	  
	  const daysData: DayDefenses[] = dates.map(date => {
	    const dateDefenses = filteredDefenses.filter(d => d.date === date);
	    const locations = Array.from(new Set(dateDefenses.map(d => d.location)))
	      .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
	    
	    return {
	      date,
	      displayDate: new Date(date).toLocaleDateString('fr-FR', { 
	        weekday: 'long', 
	        day: 'numeric', 
	        month: 'long' 
	      }),
	      locations,
	      defenses: dateDefenses.sort((a, b) => a.startTime.localeCompare(b.startTime))
	    };
	  });
	  
	  // **TOUJOURS mettre à jour** (évite les problèmes de comparaison)
	  setDayDefenses(daysData);
	}, [eleves, selectedCategory, selectedDates, selectedLocations]);
	
	
	const refreshCalendar = () => {
	  loadData(); // Recharger toutes les données
	  setTimeout(() => {
	    prepareCalendarData();
	  }, 500);
	};
	
  
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setIsMenuOpen(false); // Ferme le menu sur mobile
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // ========== COMPOSANT SIDEBAR ==========
  const Sidebar = () => (
    <>
      {/* Overlay mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative top-0 left-0 h-screen
        bg-white border-r border-gray-200
        z-40 transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        {/* En-tête */}
        <div className="p-4 border-b border-gray-200">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">TFH Portal</h2>
                <p className="text-xs text-gray-500">Coordinateur</p>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Réduire"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Agrandir"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-all
                hover:bg-gray-50
                ${activeTab === tab.id 
                  ? `bg-${tab.color}-50 text-${tab.color}-700 border border-${tab.color}-200` 
                  : 'text-gray-700'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
              title={sidebarCollapsed ? tab.name : ''}
            >
              <div className={`
                p-2 rounded-lg
                ${activeTab === tab.id 
                  ? `bg-${tab.color}-100 text-${tab.color}-600` 
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {tab.icon}
              </div>
              
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <div className="font-medium flex items-center justify-between">
                    <span>{tab.name}</span>
                    {tab.showCount && tab.count !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${tab.color}-100 text-${tab.color}-700`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{tab.description}</div>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Pied de page */}
        <div className="p-4 border-t border-gray-200">
          {!sidebarCollapsed ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                Connecté en tant que <span className="font-medium">{userName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );

  // ========== CONTENU DES ONGLETS (À COPIER DE VOTRE ANCIEN FICHIER) ==========
  // ⚠️ IMPORTANT : Copiez le contenu JSX de chaque onglet depuis votre ancien fichier
  
  // Exemple pour l'onglet 'convocations' :
  const renderConvocationsTab = () => (
          <>
            <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
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
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingModeConvocations}
                      onChange={(e) => setEditingModeConvocations(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">
                      Mode édition
                    </span>
                  </label>
                </div>
                
                <span className="text-sm text-gray-500">
                  ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''})
                </span>
              </div>
              
              {/* Légende des couleurs */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Légende des convocations:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
                        <div key={opt.value} className={`${opt.color} px-3 py-2 rounded-lg text-xs font-medium flex items-start gap-2`}>
                          <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{
                            backgroundColor: opt.color.includes('green') ? '#10B981' :
                                           opt.color.includes('yellow') ? '#F59E0B' :
                                           opt.color.includes('orange') ? '#F97316' :
                                           opt.color.includes('red') ? '#EF4444' : '#6B7280'
                          }}></div>
                          <span className="leading-tight">{opt.label}</span>
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
                      {editingModeConvocations ? 'Cliquez pour faire tourner: ? → ✓ → ✗ → ?' : 'Activez le mode édition pour modifier'}
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
                          
                          {/* Guide */}
                          <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                            {editingModeConvocations ? (
                              <select
                                value={eleve.guide_id || ''}
                                onChange={(e) => handleSelectUpdate(eleve.id, 'guide_id', e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                              >
                                <option value="">-</option>
                                {guides.map(guide => (
                                  <option key={guide.id} value={guide.id}>
                                    {guide.nom} {guide.prenom}.
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>
                                {eleve.guide_nom} {eleve.guide_prenom}.
                              </span>
                            )}
                          </td>
                          
                          {/* Catégorie */}
                          <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                            {editingModeConvocations ? (
                              <div className="flex flex-col gap-1">
                                <select
                                  value={eleve.categorie || ''}
                                  onChange={(e) => handleSelectUpdate(eleve.id, 'categorie', e.target.value)}
                                  className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                                >
                                  <option value="">-</option>
                                  {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="Nouvelle catégorie"
                                    className="flex-1 border rounded px-2 py-1 text-xs"
                                  />
                                  <button
                                    onClick={handleAddCategory}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span>{eleve.categorie || '-'}</span>
                            )}
                          </td>
                          
                          {/* Problématique */}
                          <td className="px-3 py-3 text-xs md:text-sm">
                            {editingModeConvocations && editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                              <textarea
                                defaultValue={eleve.problematique}
                                onBlur={(e) => handleUpdate(eleve.id, 'problematique', e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                                rows={3}
                                autoFocus
                              />
                            ) : editingModeConvocations ? (
                              <div
                                onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                                className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start"
                              >
                                {eleve.problematique || '-'}
                              </div>
                            ) : (
                              <div className="min-h-[60px] flex items-start">
                                {eleve.problematique || '-'}
                              </div>
                            )}
                          </td>
                          
                          {/* Convocation Mars */}
                          <td className="px-3 py-3">
                            {editingModeConvocations ? (
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
                            ) : (
                              <div className={`px-2 py-1 rounded ${getConvocationColor(eleve.convocation_mars || '')}`}>
                                {getConvocationLabel(eleve.convocation_mars || '').split(',')[0]}
                              </div>
                            )}
                          </td>
                          
                          {/* Présence 9 mars */}
                          <td className="px-3 py-3 text-center">
                            {editingModeConvocations ? (
                              <button
                                onClick={() => handlePresenceUpdate(eleve.id, 'presence_9_mars', eleve.presence_9_mars)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence9Mars.bgColor} ${presence9Mars.hoverColor} ${presence9Mars.textColor} font-bold text-lg`}
                                title={`${presence9Mars.title} (cliquer pour changer)`}
                              >
                                {presence9Mars.icon}
                              </button>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence9Mars.bgColor} ${presence9Mars.textColor} font-bold text-lg`}>
                                {presence9Mars.icon}
                              </div>
                            )}
                          </td>
                          
                          {/* Présence 10 mars */}
                          <td className="px-3 py-3 text-center">
                            {editingModeConvocations ? (
                              <button
                                onClick={() => handlePresenceUpdate(eleve.id, 'presence_10_mars', eleve.presence_10_mars)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence10Mars.bgColor} ${presence10Mars.hoverColor} ${presence10Mars.textColor} font-bold text-lg`}
                                title={`${presence10Mars.title} (cliquer pour changer)`}
                              >
                                {presence10Mars.icon}
                              </button>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence10Mars.bgColor} ${presence10Mars.textColor} font-bold text-lg`}>
                                {presence10Mars.icon}
                              </div>
                            )}
                          </td>
                          
                          {/* Convocation Avril */}
                          <td className="px-3 py-3">
                            {editingModeConvocations ? (
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
                            ) : (
                              <div className={`px-2 py-1 rounded ${getConvocationColor(eleve.convocation_avril || '')}`}>
                                {getConvocationLabel(eleve.convocation_avril || '').split(',')[0]}
                              </div>
                            )}
                          </td>
                          
                          {/* Présence 16 avril */}
                          <td className="px-3 py-3 text-center">
                            {editingModeConvocations ? (
                              <button
                                onClick={() => handlePresenceUpdate(eleve.id, 'presence_16_avril', eleve.presence_16_avril)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence16Avril.bgColor} ${presence16Avril.hoverColor} ${presence16Avril.textColor} font-bold text-lg`}
                                title={`${presence16Avril.title} (cliquer pour changer)`}
                              >
                                {presence16Avril.icon}
                              </button>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence16Avril.bgColor} ${presence16Avril.textColor} font-bold text-lg`}>
                                {presence16Avril.icon}
                              </div>
                            )}
                          </td>
                          
                          {/* Présence 17 avril */}
                          <td className="px-3 py-3 text-center">
                            {editingModeConvocations ? (
                              <button
                                onClick={() => handlePresenceUpdate(eleve.id, 'presence_17_avril', eleve.presence_17_avril)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence17Avril.bgColor} ${presence17Avril.hoverColor} ${presence17Avril.textColor} font-bold text-lg`}
                                title={`${presence17Avril.title} (cliquer pour changer)`}
                              >
                                {presence17Avril.icon}
                              </button>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence17Avril.bgColor} ${presence17Avril.textColor} font-bold text-lg`}>
                                {presence17Avril.icon}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
  );



  const renderDefensesTab = () => (
  
            <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingModeDefenses}
                      onChange={(e) => setEditingModeDefenses(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">
                      Mode édition défenses
                    </span>
                  </label>
                </div>
                
                <span className="text-sm text-gray-500">
                  ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''})
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="min-w-[1400px] md:min-w-full">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap sticky-col">Nom</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prénom</th>
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Classe</th>
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
                        <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap sticky-col">
                          {eleve.nom}
                        </td>
                        <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.prenom}</td>
                        <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.classe}</td>
                        <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                          {eleve.categorie || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs md:text-sm">
                          <div className="whitespace-pre-wrap break-words max-w-xs">
                            {eleve.problematique || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                          {eleve.guide_nom} {eleve.guide_prenom}.
                        </td>  
                        
                        <td className="px-3 py-3">
                          <select
                            value={eleve.lecteur_interne_id || ''}
                            onChange={(e) => handleSelectUpdate(eleve.id, 'lecteur_interne_id', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                            disabled={!editingModeDefenses}
                          >
                            <option value="">-</option>
                            {guides.map(guide => (
                              <option key={guide.id} value={guide.id}>
                                {guide.nom} {guide.initiale}.
                              </option>
                            ))}
                          </select>
                        </td>
                        
                        <td className="px-3 py-3">
                          <select
                            value={eleve.lecteur_externe_id || ''}
                            onChange={(e) => handleSelectUpdate(eleve.id, 'lecteur_externe_id', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                            disabled={!editingModeDefenses}
                          >
                            <option value="">-</option>
                            {lecteursExternes.map(lecteur => (
                              <option key={lecteur.id} value={lecteur.id}>
                                {lecteur.prenom} {lecteur.nom}
                              </option>
                            ))}
                          </select>
                        </td>
                        
                        <td className="px-3 py-3">
                          <select
                            value={eleve.mediateur_id || ''}
                            onChange={(e) => handleSelectUpdate(eleve.id, 'mediateur_id', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                            disabled={!editingModeDefenses || mediateurs.length === 0}
                          >
                            <option value="">-</option>
                            {mediateurs.map(mediateur => (
                              <option key={mediateur.id} value={mediateur.id}>
                                {mediateur.prenom} {mediateur.nom}
                              </option>
                            ))}
                          </select>
                        </td>   
                                              
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={formatDateForInput(eleve.date_defense)}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                handleUpdate(eleve.id, 'date_defense', newValue);
                              }}
                              className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                              disabled={!editingModeDefenses}
                            />
                            {editingModeDefenses && eleve.date_defense && (
                              <button
                                onClick={() => handleUpdate(eleve.id, 'date_defense', '')}
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Effacer la date"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                                              
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={eleve.heure_defense || ''}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                handleUpdate(eleve.id, 'heure_defense', newValue);
                              }}
                              className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                              disabled={!editingModeDefenses}
                            />
                            {editingModeDefenses && eleve.heure_defense && (
                              <button
                                onClick={() => handleUpdate(eleve.id, 'heure_defense', '')}
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Effacer l'heure"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                                              
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={eleve.localisation_defense || ''}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                handleUpdate(eleve.id, 'localisation_defense', newValue);
                              }}
                              className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                              placeholder="Salle, bâtiment..."
                              disabled={!editingModeDefenses}
                            />
                            {editingModeDefenses && eleve.localisation_defense && (
                              <button
                                onClick={() => handleUpdate(eleve.id, 'localisation_defense', '')}
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Effacer la localisation"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
  );
  
  
  const renderCalendrierTab = () => (
            <div className="space-y-6">						
			{conflicts.length > 0 && <ConflictDisplay conflicts={conflicts} />}
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Filtres du Calendrier</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner les jours
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {Array.from(new Set(eleves
                      .filter(e => e.date_defense)
                      .map(e => e.date_defense!)
                      .sort()
                    )).map(date => (
                      <div key={date} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          id={`date-${date}`}
                          checked={selectedDates.includes(date)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDates([...selectedDates, date]);
                            } else {
                              setSelectedDates(selectedDates.filter(d => d !== date));
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`date-${date}`} className="text-sm">
                          {new Date(date).toLocaleDateString('fr-FR', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </label>
                      </div>
                    ))}
                    {eleves.filter(e => e.date_defense).length === 0 && (
                      <p className="text-sm text-gray-500">Aucune date de défense programmée</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const allDates = Array.from(new Set(
                        eleves
                          .filter(e => e.date_defense)
                          .map(e => e.date_defense!)
                      )).sort();
                      setSelectedDates(selectedDates.length === allDates.length ? [] : allDates);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedDates.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégories
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded p-3 bg-white">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="cat-toutes"
                        checked={selectedCategory === 'toutes'}
                        onChange={(e) => {
                          setSelectedCategory('toutes');
                        }}
                        className="mr-2"
                      />
                      <label 
                        htmlFor="cat-toutes" 
                        className="text-sm font-medium cursor-pointer flex items-center"
                      >
                        <div className="w-4 h-4 rounded mr-2 border" style={{ 
                          backgroundColor: '#F3F4F6',
                          borderColor: '#D1D5DB'
                        }}></div>
                        Toutes les catégories
                      </label>
                    </div>
                    
                    <div className="space-y-1">
                      {categories.map(cat => {
                        const color = getCategoryColor(cat);
                        return (
                          <div key={cat} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`cat-${cat}`}
                              checked={selectedCategory === cat}
                              onChange={(e) => {
                                setSelectedCategory(cat);
                              }}
                              className="mr-2"
                            />
                            <label 
                              htmlFor={`cat-${cat}`} 
                              className="text-sm cursor-pointer flex items-center group"
                            >
                              <div 
                                className="w-4 h-4 rounded mr-2 border group-hover:opacity-80 transition-opacity"
                                style={{ 
                                  backgroundColor: color.bg,
                                  borderColor: color.border
                                }}
                                title={cat}
                              ></div>
                              <span className="truncate">{cat}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner les locaux
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {Array.from(new Set(eleves
                      .filter(e => e.localisation_defense)
                      .map(e => e.localisation_defense!)
                      .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)))
                    )).map(location => (
                      <div key={location} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          id={`loc-${location}`}
                          checked={selectedLocations.includes(location)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLocations([...selectedLocations, location]);
                            } else {
                              setSelectedLocations(selectedLocations.filter(l => l !== location));
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`loc-${location}`} className="text-sm truncate">
                          {location}
                        </label>
                      </div>
                    ))}
                    {eleves.filter(e => e.localisation_defense).length === 0 && (
                      <p className="text-sm text-gray-500">Aucun local défini</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const allLocations = Array.from(new Set(
                        eleves
                          .filter(e => e.localisation_defense)
                          .map(e => e.localisation_defense!)
                      )).sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
                      setSelectedLocations(selectedLocations.length === allLocations.length ? [] : allLocations);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedLocations.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>
                  Affichage de {dayDefenses.length} {pluralize(dayDefenses.length, 'jour', 'jours')}
                  {' • '}
                  {selectedLocations.length > 0 
                    ? `${selectedLocations.length} ${pluralize(selectedLocations.length, 'local', 'locaux')} sélectionné${selectedLocations.length > 1 ? 's' : ''}`
                    : 'Tous les locaux'}
                  {' • '}
                  {selectedCategory === 'toutes' ? 'Toutes catégories' : `Catégorie: ${selectedCategory}`}
                </p>
              </div>
            </div>
            
            <CalendarDisplay
              key={`calendar-${calendarRefreshTrigger}`}
              eleves={eleves}
              selectedCategory={selectedCategory}
              selectedDates={selectedDates}
              selectedLocations={selectedLocations}
            />
          </div>
  );
  
  
  const renderGestionUtilisateursTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ajouter un utilisateur</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d'utilisateur</label>
            <select
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value as UserType)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="eleves">Élève</option>
              <option value="guides">Guide</option>
              <option value="lecteurs-externes">Lecteur externe</option>
              <option value="mediateurs">Médiateur</option>
              <option value="coordinateurs">Coordinateur</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Import massif</label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMassImport(true)}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                📥 Importer CSV
              </button>
              {(selectedUserType === 'eleves' || selectedUserType === 'guides') && (
                <button
                  onClick={() => setShowClearConfirmations(true)}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                >
                  🗑️ Tout supprimer
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Formulaire d'ajout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {selectedUserType === 'eleves' && (
            <>
              <input
                type="text"
                placeholder="Nom"
                value={newUser.nom}
                onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Prénom"
                value={newUser.prenom}
                onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Classe"
                value={newUser.classe}
                onChange={(e) => setNewUser({...newUser, classe: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
            </>
          )}
          
          {(selectedUserType === 'lecteurs-externes' || selectedUserType === 'mediateurs') && (
            <>
              <input
                type="text"
                placeholder="Nom"
                value={newUser.nom}
                onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Prénom"
                value={newUser.prenom}
                onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
            </>
          )}
          
          {(selectedUserType === 'guides' || selectedUserType === 'coordinateurs') && (
            <>
              <input
                type="text"
                placeholder="Nom"
                value={newUser.nom}
                onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Prénom"
                value={newUser.prenom}
                onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                className="border rounded px-3 py-2 text-sm"
              />
            </>
          )}
        </div>

        {/* Bouton Ajouter */}
        <button
          onClick={handleAddUser}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
        >
          <span>+</span>
          <span>Ajouter</span>
        </button>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-700">
            Liste des {selectedUserType} ({getCurrentUserCount()})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                {selectedUserType === 'eleves' && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </>
                )}
                {selectedUserType === 'guides' && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </>
                )}
                {(selectedUserType === 'lecteurs-externes' || selectedUserType === 'mediateurs') && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </>
                )}
                {selectedUserType === 'coordinateurs' && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {getCurrentUsers().map((user: any) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  {selectedUserType === 'eleves' && (
                    <>
                      <td className="px-4 py-3 text-sm">{user.classe}</td>
                      <td className="px-4 py-3 text-sm">{user.nom}</td>
                      <td className="px-4 py-3 text-sm">{user.prenom}</td>
                      <td className="px-4 py-3 text-sm">{user.categorie || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                        >
                          <span>✕</span>
                          <span>Supprimer</span>
                        </button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'guides' && (
                    <>
                      <td className="px-4 py-3 text-sm">{user.nom}</td>
                      <td className="px-4 py-3 text-sm">{user.prenom}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                        >
                          <span>✕</span>
                          <span>Supprimer</span>
                        </button>
                      </td>
                    </>
                  )}
                  {(selectedUserType === 'lecteurs-externes' || selectedUserType === 'mediateurs') && (
                    <>
                      <td className="px-4 py-3 text-sm">{user.nom}</td>
                      <td className="px-4 py-3 text-sm">{user.prenom}</td>
                      <td className="px-4 py-3 text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                        >
                          <span>✕</span>
                          <span>Supprimer</span>
                        </button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'coordinateurs' && (
                    <>
                      <td className="px-4 py-3 text-sm">{user.nom}</td>
                      <td className="px-4 py-3 text-sm">{user.prenom}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                        >
                          <span>✕</span>
                          <span>Supprimer</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
  
  const renderParametresTab = () => {
    const toggleSection = (section: keyof typeof expandedSections) => {
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    };
    
  
  return (
    <div className="space-y-6">
      {/* Section 1: Paramètres fonctionnels */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('fonctionnels')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
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
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.fonctionnels ? 'rotate-90' : ''}`} />
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
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
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
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.affichage ? 'rotate-90' : ''}`} />
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
      
	
	{/* Section 3: Paramètres de l'année TFH - VERSION TABLEAU */}
	<div className="bg-white rounded-lg shadow">
	  <button
	    onClick={() => toggleSection('annee')}
	    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
	  >
	    <div className="flex items-center gap-3">
	      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
	        <Calendar className="w-5 h-5" />
	      </div>
	      <div className="text-left">
	        <h3 className="text-lg font-semibold text-gray-800">Paramètres de l'année TFH</h3>
	        <p className="text-sm text-gray-500">Configuration des 10 journées TFH</p>
	      </div>
	    </div>
	    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.annee ? 'rotate-90' : ''}`} />
	  </button>
	  
	  {expandedSections.annee && (
	    <div className="px-6 pb-6 pt-2 border-t">
	      <div className="mb-6">
	        <p className="text-sm text-gray-600 mb-2">
	          Configurez les dates des 10 journées TFH pour l'année scolaire en cours.
	          Ces dates seront utilisées pour le suivi et le calendrier.
	        </p>
	        
	        <div className="flex items-center justify-between">
	          <div className="text-sm text-gray-500">
	            {journeesTFH.filter(j => j.date).length} / 10 dates définies
	          </div>
	          <button
	            onClick={loadJourneesTFH}
	            className="text-sm text-orange-600 hover:text-orange-800 flex items-center gap-1"
	          >
	            <RefreshCw className="w-4 h-4" />
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
	                    className={`hover:bg-gray-50 transition-colors ${
	                      journee.id <= 2 ? 'bg-blue-50/30' : 
	                      journee.id <= 4 ? 'bg-green-50/30' : 
	                      'bg-gray-50/30'
	                    }`}
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
	                          disabled={!journee.date}
	                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
	                            journee.date 
	                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
	                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
	                          }`}
	                        >
	                          Sauvegarder
	                        </button>
	                        {journee.date && (
	                          <button
	                            onClick={() => {
	                              if (confirm(`Supprimer la date pour la journée ${journee.id} ?`)) {
	                                setJourneesTFH(prev => prev.map(j => 
	                                  j.id === journee.id ? { ...j, date: '' } : j
	                                ));
	                              }
	                            }}
	                            className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-xs font-medium"
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
						    onClick={() => {
						      const nouvelleJourneeId = journeesTFH.length + 1;
						      setJourneesTFH(prev => [
						        ...prev,
						        {
						          id: nouvelleJourneeId,
						          date: '',
						          libelle: `Journée ${nouvelleJourneeId}`
						        }
						      ]);
						    }}
						    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
						  >
						    <Plus className="w-5 h-5" />
						    Ajouter une journée supplémentaire
						  </button>
						</div>			
	          
	          {/* BOUTONS D'ACTION */}
	          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
	            <div className="text-sm text-gray-500">
	              <span className="inline-block w-3 h-3 bg-blue-100 mr-1"></span> Sessions mars
	              <span className="inline-block w-3 h-3 bg-green-100 mx-3 mr-1"></span> Sessions avril
	              <span className="inline-block w-3 h-3 bg-gray-100 mr-1 ml-3"></span> Défenses & révisions
	            </div>
	            <div className="flex gap-3">
	              <button
	                onClick={() => {
	                  // Effacer toutes les dates
	                  if (confirm('Voulez-vous effacer toutes les dates ?')) {
	                    setJourneesTFH(prev => prev.map(j => ({ ...j, date: '' })));
	                  }
	                }}
	                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
	              >
	                Tout effacer
	              </button>
	              <button
	                onClick={saveAllJournees}
	                disabled={journeesTFH.filter(j => j.date).length === 0}
	                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
	                  journeesTFH.filter(j => j.date).length > 0
	                    ? 'bg-orange-600 text-white hover:bg-orange-700'
	                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
	                }`}
	              >
	                <Save className="w-4 h-4" />
	                Sauvegarder toutes les dates
	              </button>
	            </div>
	          </div>
	          
						{/* LÉGENDE ET CONSEILS - Section modifiée */}
						<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
						  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
						    <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
						      <Info className="w-4 h-4" />
						      Sessions détectées
						    </h4>
						    <div className="space-y-2">
						      {(() => {
						        const sessions = detecterSessions();
						        const sessionsUniques = [...new Set(Object.values(sessions))].sort();
						        
						        return sessionsUniques.map(sessionId => {
						          const joursDansSession = Object.entries(sessions)
						            .filter(([_, sId]) => sId === sessionId)
						            .map(([jourId]) => parseInt(jourId));
						          
						          const dates = joursDansSession
						            .map(id => journeesTFH.find(j => j.id === id)?.date)
						            .filter(Boolean)
						            .map(date => new Date(date!));
						          
						          const couleursSession = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-yellow-100', 'bg-pink-100', 'bg-indigo-100'];
						          const couleurIndex = (sessionId - 1) % couleursSession.length;
						          
						          return (
						            <div key={sessionId} className="flex items-center gap-3">
						              <div className={`w-3 h-3 rounded-full ${couleursSession[couleurIndex]}`}></div>
						              <div className="text-sm text-gray-700">
						                <span className="font-medium">Session {sessionId}:</span>
						                <span className="ml-2">
						                  J{joursDansSession.join(', J')}
						                  {dates.length > 0 && (
						                    <span className="text-gray-500 ml-2">
						                      ({dates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})
						                    </span>
						                  )}
						                </span>
						              </div>
						            </div>
						          );
						        });
						      })()}
						      
						      {Object.keys(detecterSessions()).length === 0 && (
						        <p className="text-sm text-gray-600 italic">
						          Ajoutez des dates pour voir les sessions regroupées
						        </p>
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
};
  
  
  const renderStatsTab = () => (
				  <div className="space-y-6">
				    <div className="bg-white rounded-lg shadow p-6">
				      <h2 className="text-xl font-semibold text-gray-800 mb-2">📊 Statistiques générales</h2>
				      <p className="text-gray-600">
				        Vue d'ensemble de l'avancement des TFH
				      </p>
				    </div>
				
				    {stats ? (
				      <>
							{/* Cartes de statistiques */}
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							  {/* Carte 1 - Thématique */}
							  <div 
							    onClick={() => openModal('Élèves sans thématique définie', 'thematique')}
							    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1"
							  >
							    <div className="flex items-center justify-between mb-4">
							      <h3 className="text-lg font-semibold text-gray-800">Thématique</h3>
							      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							        {stats.pourcentageThematique.toFixed(1)}%
							      </span>
							    </div>
							    <div className="mb-4">
							      <div className="text-3xl font-bold text-gray-900">{stats.avecThematique}</div>
							      <div className="text-sm text-gray-500">sur {stats.totalEleves} élèves</div>
							    </div>
							    <div className="w-full bg-gray-200 rounded-full h-2">
							      <div 
							        className="h-2 rounded-full bg-blue-500"
							        style={{ width: `${Math.min(stats.pourcentageThematique, 100)}%` }}
							      />
							    </div>
							    <div className="mt-3 text-xs text-blue-600 font-medium text-center">
							      Cliquez pour voir la liste
							    </div>
							  </div>
							
							  {/* Carte 2 - Problématique */}
							  <div 
							    onClick={() => openModal('Élèves sans problématique définie', 'problematique')}
							    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1"
							  >
							    <div className="flex items-center justify-between mb-4">
							      <h3 className="text-lg font-semibold text-gray-800">Problématique</h3>
							      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
							        {stats.pourcentageProblematique.toFixed(1)}%
							      </span>
							    </div>
							    <div className="mb-4">
							      <div className="text-3xl font-bold text-gray-900">{stats.avecProblematique}</div>
							      <div className="text-sm text-gray-500">sur {stats.totalEleves} élèves</div>
							    </div>
							    <div className="w-full bg-gray-200 rounded-full h-2">
							      <div 
							        className="h-2 rounded-full bg-green-500"
							        style={{ width: `${Math.min(stats.pourcentageProblematique, 100)}%` }}
							      />
							    </div>
							    <div className="mt-3 text-xs text-green-600 font-medium text-center">
							      Cliquez pour voir la liste
							    </div>
							  </div>
							
							  {/* Carte 3 - Sources complètes */}
							  <div 
							    onClick={() => openModal('Élèves sans 5 sources complètes', 'sources')}
							    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1"
							  >
							    <div className="flex items-center justify-between mb-4">
							      <h3 className="text-lg font-semibold text-gray-800">5 Sources rendues</h3>
							      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
							        {stats.pourcentageSources.toFixed(1)}%
							      </span>
							    </div>
							    <div className="mb-4">
							      <div className="text-3xl font-bold text-gray-900">{stats.avecSources}</div>
							      <div className="text-sm text-gray-500">sur {stats.totalEleves} élèves</div>
							    </div>
							    <div className="w-full bg-gray-200 rounded-full h-2">
							      <div 
							        className="h-2 rounded-full bg-purple-500"
							        style={{ width: `${Math.min(stats.pourcentageSources, 100)}%` }}
							      />
							    </div>
							    <div className="mt-3 text-xs text-purple-600 font-medium text-center">
							      Cliquez pour voir la liste
							    </div>
							  </div>
							
							  {/* Carte 4 - Guide assigné */}
							  <div 
							    onClick={() => openModal('Élèves sans guide assigné', 'guide')}
							    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1"
							  >
							    <div className="flex items-center justify-between mb-4">
							      <h3 className="text-lg font-semibold text-gray-800">Guide assigné</h3>
							      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
							        {stats.pourcentageGuide.toFixed(1)}%
							      </span>
							    </div>
							    <div className="mb-4">
							      <div className="text-3xl font-bold text-gray-900">{stats.avecGuide}</div>
							      <div className="text-sm text-gray-500">sur {stats.totalEleves} élèves</div>
							    </div>
							    <div className="w-full bg-gray-200 rounded-full h-2">
							      <div 
							        className="h-2 rounded-full bg-yellow-500"
							        style={{ width: `${Math.min(stats.pourcentageGuide, 100)}%` }}
							      />
							    </div>
							    <div className="mt-3 text-xs text-yellow-600 font-medium text-center">
							      Cliquez pour voir la liste
							    </div>
							  </div>
							
							  {/* Carte 5 - Lecteur interne */}
							  <div 
							    onClick={() => openModal('Élèves sans lecteur interne', 'lecteur_interne')}
							    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1"
							  >
							    <div className="flex items-center justify-between mb-4">
							      <h3 className="text-lg font-semibold text-gray-800">Lecteur interne</h3>
							      <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
							        {stats.pourcentageLecteurInterne.toFixed(1)}%
							      </span>
							    </div>
							    <div className="mb-4">
							      <div className="text-3xl font-bold text-gray-900">{stats.avecLecteurInterne}</div>
							      <div className="text-sm text-gray-500">sur {stats.totalEleves} élèves</div>
							    </div>
							    <div className="w-full bg-gray-200 rounded-full h-2">
							      <div 
							        className="h-2 rounded-full bg-indigo-500"
							        style={{ width: `${Math.min(stats.pourcentageLecteurInterne, 100)}%` }}
							      />
							    </div>
							    <div className="mt-3 text-xs text-indigo-600 font-medium text-center">
							      Cliquez pour voir la liste
							    </div>
							  </div>
							
							  {/* Carte 6 - Lecteur externe */}
							  <div 
							    onClick={() => openModal('Élèves sans lecteur externe', 'lecteur_externe')}
							    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1"
							  >
							    <div className="flex items-center justify-between mb-4">
							      <h3 className="text-lg font-semibold text-gray-800">Lecteur externe</h3>
							      <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
							        {stats.pourcentageLecteurExterne.toFixed(1)}%
							      </span>
							    </div>
							    <div className="mb-4">
							      <div className="text-3xl font-bold text-gray-900">{stats.avecLecteurExterne}</div>
							      <div className="text-sm text-gray-500">sur {stats.totalEleves} élèves</div>
							    </div>
							    <div className="w-full bg-gray-200 rounded-full h-2">
							      <div 
							        className="h-2 rounded-full bg-pink-500"
							        style={{ width: `${Math.min(stats.pourcentageLecteurExterne, 100)}%` }}
							      />
							    </div>
							    <div className="mt-3 text-xs text-pink-600 font-medium text-center">
							      Cliquez pour voir la liste
							    </div>
							  </div>
							</div>
				
				        {/* Tableau détaillé */}
				        <div className="bg-white rounded-lg shadow overflow-hidden">
				          <table className="w-full">
				            <thead className="bg-gray-100 border-b">
				              <tr>
				                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
				                  Métrique
				                </th>
				                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
				                  Nombre
				                </th>
				                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
				                  Pourcentage
				                </th>
				                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
				                  Total élèves
				                </th>
				              </tr>
				            </thead>
				            <tbody className="divide-y divide-gray-200">
				              <tr>
				                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
				                  Avec thématique
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
				                  {stats.avecThematique}
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap">
				                  <div className="flex items-center">
				                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
				                      <div 
				                        className="bg-blue-500 h-2 rounded-full"
				                        style={{ width: `${Math.min(stats.pourcentageThematique, 100)}%` }}
				                      />
				                    </div>
				                    <span className="text-sm font-medium text-gray-900">
				                      {stats.pourcentageThematique.toFixed(1)}%
				                    </span>
				                  </div>
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
				                  {stats.totalEleves}
				                </td>
				              </tr>
				              <tr>
				                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
				                  Avec problématique
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
				                  {stats.avecProblematique}
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap">
				                  <div className="flex items-center">
				                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
				                      <div 
				                        className="bg-green-500 h-2 rounded-full"
				                        style={{ width: `${Math.min(stats.pourcentageProblematique, 100)}%` }}
				                      />
				                    </div>
				                    <span className="text-sm font-medium text-gray-900">
				                      {stats.pourcentageProblematique.toFixed(1)}%
				                    </span>
				                  </div>
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
				                  {stats.totalEleves}
				                </td>
				              </tr>
				              <tr>
				                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
				                  5 sources rendues
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
				                  {stats.avecSources}
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap">
				                  <div className="flex items-center">
				                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
				                      <div 
				                        className="bg-purple-500 h-2 rounded-full"
				                        style={{ width: `${Math.min(stats.pourcentageSources, 100)}%` }}
				                      />
				                    </div>
				                    <span className="text-sm font-medium text-gray-900">
				                      {stats.pourcentageSources.toFixed(1)}%
				                    </span>
				                  </div>
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
				                  {stats.totalEleves}
				                </td>
				              </tr>
				              <tr>
				                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
				                  Guide assigné
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
				                  {stats.avecGuide}
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap">
				                  <div className="flex items-center">
				                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
				                      <div 
				                        className="bg-yellow-500 h-2 rounded-full"
				                        style={{ width: `${Math.min(stats.pourcentageGuide, 100)}%` }}
				                      />
				                    </div>
				                    <span className="text-sm font-medium text-gray-900">
				                      {stats.pourcentageGuide.toFixed(1)}%
				                    </span>
				                  </div>
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
				                  {stats.totalEleves}
				                </td>
				              </tr>
				              <tr>
				                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
				                  Lecteur interne
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
				                  {stats.avecLecteurInterne}
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap">
				                  <div className="flex items-center">
				                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
				                      <div 
				                        className="bg-indigo-500 h-2 rounded-full"
				                        style={{ width: `${Math.min(stats.pourcentageLecteurInterne, 100)}%` }}
				                      />
				                    </div>
				                    <span className="text-sm font-medium text-gray-900">
				                      {stats.pourcentageLecteurInterne.toFixed(1)}%
				                    </span>
				                  </div>
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
				                  {stats.totalEleves}
				                </td>
				              </tr>
				              <tr>
				                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
				                  Lecteur externe
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
				                  {stats.avecLecteurExterne}
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap">
				                  <div className="flex items-center">
				                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
				                      <div 
				                        className="bg-pink-500 h-2 rounded-full"
				                        style={{ width: `${Math.min(stats.pourcentageLecteurExterne, 100)}%` }}
				                      />
				                    </div>
				                    <span className="text-sm font-medium text-gray-900">
				                      {stats.pourcentageLecteurExterne.toFixed(1)}%
				                    </span>
				                  </div>
				                </td>
				                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
				                  {stats.totalEleves}
				                </td>
				              </tr>
				            </tbody>
				          </table>
				        </div>
				      </>
				    ) : (
				      <div className="text-center py-12">
				        <div className="text-xl">Chargement des statistiques...</div>
				      </div>
				    )}
				  </div>
  );
  
  
  const renderControleTab = () => (
				  <div className="space-y-6">
				    <div className="bg-white rounded-lg shadow p-6">
				      <h2 className="text-xl font-semibold text-gray-800 mb-2">👥 Contrôle des guides</h2>
				      <p className="text-gray-600">
				        Vue détaillée de l'activité et des performances des guides
				      </p>
				    </div>
				
				    {/* Tableau des stats guides */}
				    <div className="bg-white rounded-lg shadow overflow-x-auto">
				      <table className="w-full">
				        <thead className="bg-gray-100 border-b">
				          <tr>
				            <th 
				              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
				              onClick={() => handleSort('nom')}
				            >
				              <div className="flex items-center gap-1">
				                Guide {getSortIcon('nom')}
				              </div>
				            </th>
				            <th 
				              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
				              onClick={() => handleSort('elevesGuides')}
				            >
				              <div className="flex items-center gap-1">
				                TFH comme guide {getSortIcon('elevesGuides')}
				              </div>
				            </th>
				            <th 
				              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
				              onClick={() => handleSort('elevesLecteurInterne')}
				            >
				              <div className="flex items-center gap-1">
				                TFH comme lecteur interne {getSortIcon('elevesLecteurInterne')}
				              </div>
				            </th>
				            <th 
				              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
				              onClick={() => handleSort('pourcentageConvocationsMars')}
				            >
				              <div className="flex items-center gap-1">
				                % convoc. mars {getSortIcon('pourcentageConvocationsMars')}
				              </div>
				            </th>
				            <th 
				              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
				              onClick={() => handleSort('pourcentageConvocationsAvril')}
				            >
				              <div className="flex items-center gap-1">
				                % convoc. avril {getSortIcon('pourcentageConvocationsAvril')}
				            </div>
				            </th>
				          </tr>
				        </thead>
				        <tbody className="divide-y divide-gray-200">
				          {guideStats.map((guide) => (
				            <tr key={guide.id} className="hover:bg-gray-50">
				              <td className="px-6 py-4 whitespace-nowrap">
				                <div className="font-medium text-gray-900">
				                  {guide.nom} {guide.prenom} {guide.initiale}.
				                </div>
				              </td>
				              <td className="px-6 py-4 whitespace-nowrap">
				                {guide.elevesGuides || '0'}
				              </td>
				              <td className="px-6 py-4 whitespace-nowrap">
				                {guide.elevesLecteurInterne || '0'}
				              </td>
				              <td className="px-6 py-4 whitespace-nowrap">
				                <div className="flex items-center">
				                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
				                    <div 
				                      className="bg-green-500 h-2 rounded-full"
				                      style={{ width: `${Math.min(guide.pourcentageConvocationsMars, 100)}%` }}
				                    />
				                  </div>
				                  <span className="text-sm font-medium">
				                    {guide.pourcentageConvocationsMars.toFixed(1)}%
				                  </span>
				                </div>
				              </td>
				              <td className="px-6 py-4 whitespace-nowrap">
				                <div className="flex items-center">
				                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
				                    <div 
				                      className="bg-blue-500 h-2 rounded-full"
				                      style={{ width: `${Math.min(guide.pourcentageConvocationsAvril, 100)}%` }}
				                    />
				                  </div>
				                  <span className="text-sm font-medium">
				                    {guide.pourcentageConvocationsAvril.toFixed(1)}%
				                  </span>
				                </div>
				              </td>
				            </tr>
				          ))}
				        </tbody>
				      </table>
				    </div>
				
				    {/* Légende */}
				    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
				      <h4 className="font-medium text-gray-700 mb-2">Légende:</h4>
				      <ul className="text-sm text-gray-600 space-y-1">
				        <li>• <strong>TFH comme guide</strong>: Nombre d'élèves assignés comme guide principal</li>
				        <li>• <strong>TFH comme lecteur interne</strong>: Nombre d'élèves où le guide est lecteur interne</li>
				        <li>• <strong>Convocations rendues</strong>: Nombre de convocations remplies / Nombre d'élèves assignés</li>
				        <li>• <strong>% convocations</strong>: Pourcentage de convocations remplies par rapport aux élèves assignés</li>
				      </ul>
				    </div>
				  </div>
  );



  // ========== DASHBOARD D'ACCUEIL ==========
  const renderDashboard = () => (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord Coordinateur</h1>
        <p className="text-gray-600">Bienvenue {userName}. Gestion complète du système TFH Portal.</p>
      </div>

      {/* Cartes de navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {tabs.filter(t => t.id !== 'dashboard').map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              bg-white rounded-xl shadow-sm border p-6 cursor-pointer
              transition-all hover:shadow-md hover:-translate-y-1
              border-${tab.color}-200 hover:border-${tab.color}-300
              group
            `}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-lg bg-${tab.color}-100 text-${tab.color}-600 group-hover:bg-${tab.color}-200`}>
                {tab.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{tab.name}</h3>
                <p className="text-sm text-gray-500">{tab.description}</p>
              </div>
              {tab.showCount && tab.count !== undefined && (
                <div className={`text-lg font-bold text-${tab.color}-600`}>
                  {tab.count}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accéder à la section</span>
                <div className={`p-1 rounded-full bg-${tab.color}-50 text-${tab.color}-600`}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Statistiques rapides */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Aperçu rapide du système</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{eleves.length}</div>
            <div className="text-sm text-blue-600">Élèves</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-green-700">{guides.length}</div>
            <div className="text-sm text-green-600">Guides</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-2xl font-bold text-purple-700">
              {eleves.filter(e => e.date_defense).length}
            </div>
            <div className="text-sm text-purple-600">Défenses programmées</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="text-2xl font-bold text-orange-700">
              {eleves.filter(e => e.convocation_mars?.startsWith('Oui')).length}
            </div>
            <div className="text-sm text-orange-600">Convoqués mars</div>
          </div>
        </div>
      </div>

      {/* Dernières activités */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleTabChange('convocations')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="font-medium text-gray-800 mb-1">📝 Saisir des convocations</div>
            <div className="text-sm text-gray-500">Pour les sessions de mars/avril</div>
          </button>
          <button
            onClick={() => handleTabChange('defenses')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="font-medium text-gray-800 mb-1">🎓 Planifier une défense</div>
            <div className="text-sm text-gray-500">Date, heure, local</div>
          </button>
          <button
            onClick={() => setShowMassImport(true)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="font-medium text-gray-800 mb-1">📥 Importer des utilisateurs</div>
            <div className="text-sm text-gray-500">CSV, Excel</div>
          </button>
        </div>
      </div>
    </div>
  );

// ========== RENDU PRINCIPAL ==========
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Chargement...</div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gray-50">
    {/* Message paysage mobile */}
    <div 
      id="landscape-message" 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      style={{ display: 'none' }}
    >
      <div className="bg-white rounded-lg p-6 max-w-sm text-center">
        <div className="text-4xl mb-4">↻</div>
        <h3 className="text-lg font-semibold mb-2">Pivotez votre appareil</h3>
        <p className="text-gray-600 mb-4">
          Pour une meilleure expérience, utilisez votre téléphone en mode paysage.
        </p>
        <button
          onClick={() => {
            const msg = document.getElementById('landscape-message');
            if (msg) msg.style.display = 'none';
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full"
        >
          J'ai compris
        </button>
      </div>
    </div>

    {/* Layout principal */}
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto">
        {/* En-tête mobile */}
        <header className="md:hidden p-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-800">
                {tabs.find(t => t.id === activeTab)?.name}
              </h1>
              <p className="text-xs text-gray-500">TFH Portal</p>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        {/* En-tête desktop */}
        <header className="hidden md:block p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {tabs.find(t => t.id === activeTab)?.name}
              </h1>
              <p className="text-gray-600">
                {tabs.find(t => t.id === activeTab)?.description}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Connecté en tant que <span className="font-semibold">{userName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        {/* Contenu de l'onglet */}
        <div className="p-4 md:p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'convocations' && renderConvocationsTab()}
          {activeTab === 'defenses' && renderDefensesTab()}
          {activeTab === 'calendrier' && renderCalendrierTab()}
          {activeTab === 'gestion-utilisateurs' && renderGestionUtilisateursTab()}
          {activeTab === 'parametres-affichage' && renderParametresTab()}
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'controle' && renderControleTab()}
        </div>
      </main>
    </div>

    {/* Modals existants */}
    {showMassImport && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Import massif depuis CSV/Excel</h3>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format attendu pour les {selectedUserType}:
              </label>
              <div className="text-sm text-gray-600 mb-3">
                {selectedUserType === 'eleves' && 'Colonnes: nom, prenom, classe, categorie (optionnel)'}
                {selectedUserType === 'guides' && 'Colonnes: nom, prenom'}
                {(selectedUserType === 'lecteurs-externes' || selectedUserType === 'mediateurs') && 'Colonnes: nom, prenom, email'}
                {selectedUserType === 'coordinateurs' && 'Colonnes: nom, prenom'}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Données CSV (vous pouvez aussi coller directement):
              </label>
              <textarea
                value={massImportData}
                onChange={(e) => setMassImportData(e.target.value)}
                rows={10}
                className="w-full border rounded px-3 py-2 text-sm font-mono"
                placeholder="Collez vos données CSV ici..."
              />
            </div>
          </div>
          
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowMassImport(false);
                setMassImportData('');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                console.log('Données brutes:', massImportData);
                const testRows = massImportData.split('\n').filter(row => row.trim());
                console.log('Lignes détectées:', testRows);
                handleMassImport();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              disabled={!massImportData.trim()}
            >
              Importer
            </button>
          </div>
        </div>
      </div>
    )}

    {showClearConfirmations && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-red-800">
              Confirmation nécessaire
            </h3>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Vous êtes sur le point de supprimer <strong>TOUS</strong> les {selectedUserType === 'eleves' ? 'élèves' : 'guides'}.
                Cette action est irréversible.
              </p>
              
              <p className="text-sm text-gray-600 mb-4">
                Pour des raisons de sécurité, cette opération nécessite la confirmation de 3 coordinateurs différents.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  Confirmations reçues: {clearConfirmations.length}/3
                  {clearConfirmations.length > 0 && (
                    <span className="block mt-1">
                      {clearConfirmations.map(name => `• ${name}`).join('\n')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
            <button
              onClick={() => {
                setShowClearConfirmations(false);
                setClearConfirmations([]);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
            >
              Annuler
            </button>
            <button
              onClick={() => handleClearAll(selectedUserType as 'eleves' | 'guides')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Confirmer ({clearConfirmations.length}/3)
            </button>
          </div>
        </div>
      </div>
    )}

    <StatsModal
      isOpen={modal.isOpen}
      onClose={() => setModal({ ...modal, isOpen: false })}
      title={modal.title}
      missingField={modal.missingField}
    />
    
    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 md:hidden">
      <p className="text-sm text-blue-700 flex items-center gap-2">
        <span className="text-lg">💡</span>
        Sur mobile, faites défiler horizontalement pour voir toutes les colonnes.
        Pour une meilleure expérience, pivotez votre appareil en mode paysage.
      </p>
    </div>
  </div>
);
}











