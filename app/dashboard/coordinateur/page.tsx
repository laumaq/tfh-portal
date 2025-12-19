// app/dashboard/coordinateur/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

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
}

type TabType = 'convocations' | 'defenses' | 'gestion-utilisateurs';
type UserType = 'eleves' | 'guides' | 'lecteurs-externes' | 'mediateurs' | 'coordinateurs';

export default function CoordinateurDashboard() {
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
  const [isLandscape, setIsLandscape] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('convocations');
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
    categorie: ''
    // Plus d'email ni de password
  });
  const [showMassImport, setShowMassImport] = useState(false);
  const [massImportData, setMassImportData] = useState<string>('');
  const [showClearConfirmations, setShowClearConfirmations] = useState(false);
  const [clearConfirmations, setClearConfirmations] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        .select('id, nom, prenom, email');

      if (lecteursError) throw lecteursError;
      setLecteursExternes(lecteursExternesData || []);

      // Charger les médiateurs
      const { data: mediateursData, error: mediateursError } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom, email');

      if (mediateursError) {
        console.warn('Table médiateurs non trouvée ou erreur:', mediateursError);
        setMediateurs([]);
      } else {
        setMediateurs(mediateursData || []);
      }

      // Charger les coordinateurs
      const { data: coordinateursData, error: coordinateursError } = await supabase
        .from('coordinateurs')
        .select('id, nom, prenom');

      if (coordinateursError) {
        console.warn('Table coordinateurs non trouvée ou erreur:', coordinateursError);
        setCoordinateurs([]);
      } else {
        setCoordinateurs(coordinateursData || []);
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
    const isEditing = activeTab === 'convocations' ? editingModeConvocations : editingModeDefenses;
    if (!isEditing) return;
    
    try {
      const updateData: any = {};
      
      if (value === '') {
        updateData[field] = null;
      } else {
        updateData[field] = value;
      }
  
      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);
  
      if (error) throw error;
  
      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { 
          ...eleve, 
          [field]: value === '' ? null : value 
        } : eleve
      ));
      
      setFilteredEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { 
          ...eleve, 
          [field]: value === '' ? null : value 
        } : eleve
      ));
  
      setEditingCell(null);
    } catch (err) {
      console.error('Erreur mise à jour:', err);
      loadData();
    }
  };

  const handleSelectUpdate = async (eleveId: string, field: string, value: string) => {
    const isEditing = activeTab === 'convocations' ? editingModeConvocations : editingModeDefenses;
    if (!isEditing) return;
    
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

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories(prev => [...prev, newCategory.trim()].sort());
      setNewCategory('');
    }
  };

  const handleAddUser = async () => {
    try {
      switch (selectedUserType) {
        case 'eleves':
          const { error: eleveError } = await supabase
            .from('eleves')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              classe: newUser.classe,
              categorie: newUser.categorie,
              guide_id: null
            }]);
  
          if (eleveError) throw eleveError;
          break;
  
        case 'guides':
          // SIMPLIFIEZ - plus d'auth Supabase
          const { error: guideError } = await supabase
            .from('guides')
            .insert([{
              nom: newUser.nom,
              initiale: newUser.initiale
              // Plus d'email ni de password
            }]);
  
          if (guideError) throw guideError;
          break;
  
        case 'lecteurs-externes':
          // Gardez email pour les lecteurs externes si la colonne existe
          const { error: lecteurError } = await supabase
            .from('lecteurs_externes')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || '' // Utilisez une valeur par défaut
            }]);
  
          if (lecteurError) throw lecteurError;
          break;
  
        case 'mediateurs':
          // Gardez email pour les médiateurs si la colonne existe
          const { error: mediateurError } = await supabase
            .from('mediateurs')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || '' // Utilisez une valeur par défaut
            }]);
  
          if (mediateurError) throw mediateurError;
          break;
  
        case 'coordinateurs':
          // SIMPLIFIEZ - plus d'auth Supabase
          const { error: coordError } = await supabase
            .from('coordinateurs')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom
              // Plus d'email ni de password
            }]);
  
          if (coordError) throw coordError;
          break;
      }
  
      alert('Utilisateur ajouté avec succès!');
      // Réinitialisez avec les bonnes propriétés
      setNewUser({
        nom: '',
        prenom: '',
        classe: '',
        // email: '', ← ENLEVEZ si plus utilisé
        initiale: '',
        // password: '', ← ENLEVEZ
        categorie: ''
      });
      loadData();
    } catch (err) {
      console.error('Erreur ajout utilisateur:', err);
      alert('Erreur lors de l\'ajout de l\'utilisateur');
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
      const rows = massImportData.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim());
      const dataRows = rows.slice(1);

      switch (selectedUserType) {
        case 'eleves':
          const elevesToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const eleve: any = {};
            headers.forEach((header, index) => {
              if (values[index]) {
                eleve[header.toLowerCase()] = values[index];
              }
            });
            return eleve;
          }).filter(e => e.nom && e.prenom && e.classe);

          if (elevesToInsert.length > 0) {
            const { error } = await supabase
              .from('eleves')
              .insert(elevesToInsert);
            if (error) throw error;
          }
          break;

        case 'guides':
          const guidesToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const guide: any = {};
            headers.forEach((header, index) => {
              if (values[index]) {
                guide[header.toLowerCase()] = values[index];
              }
            });
            return guide;
          }).filter(g => g.nom && g.initiale); // ← Changez de g.email à g.initiale
        
          if (guidesToInsert.length > 0) {
            const { error } = await supabase
              .from('guides')
              .insert(guidesToInsert);
            if (error) throw error;
          }
          break;

        // Similar logic for other user types...
      }

      alert(`${dataRows.length} utilisateurs importés avec succès!`);
      setShowMassImport(false);
      setMassImportData('');
      loadData();
    } catch (err) {
      console.error('Erreur import massif:', err);
      alert('Erreur lors de l\'importation');
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
        console.log('Retourne élèves:', eleves);
        return eleves;
      case 'guides':
        console.log('Retourne guides:', guides);
        return guides;
      case 'lecteurs-externes':
        console.log('Retourne lecteurs externes:', lecteursExternes);
        return lecteursExternes;
      case 'mediateurs':
        console.log('Retourne médiateurs:', mediateurs);
        return mediateurs;
      case 'coordinateurs':
        console.log('Retourne coordinateurs:', coordinateurs);
        return coordinateurs;
      default:
        console.log('Type inconnu, retourne tableau vide');
        return [];
    }
  };

  const getCurrentUserCount = () => {
    const users = getCurrentUsers();
    console.log('Nombre d\'utilisateurs à afficher:', users.length);
    return users.length;
  };

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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
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
          <button
            onClick={() => {
              setActiveTab('gestion-utilisateurs');
              setShowConvoques(false);
            }}
            className={`px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'gestion-utilisateurs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Gestion des Utilisateurs
          </button>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'convocations' ? (
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
                                    {guide.nom} {guide.initiale}.
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>
                                {eleve.guide_nom} {eleve.guide_initiale}.
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
        ) : activeTab === 'defenses' ? (
          /* Onglet Gestion des Défenses */
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
                          <div className="whitespace-pre-wrap break-words max-w-xs">
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
                        
                        {/* Lecteur Externe */}
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
                        
                        {/* Médiateur */}
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
                                              
                        {/* Date de défense */}
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
                                              
                        {/* Heure de défense */}
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
                                              
                        {/* Localisation */}
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
        ) : (
          /* Onglet Gestion des Utilisateurs */
          <div className="space-y-6">
            {/* Menu de sélection du type d'utilisateur */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Gestion des Utilisateurs</h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedUserType('eleves')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedUserType === 'eleves'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Élèves ({eleves.length})
                </button>
                <button
                  onClick={() => setSelectedUserType('guides')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedUserType === 'guides'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Guides ({guides.length})
                </button>
                <button
                  onClick={() => setSelectedUserType('lecteurs-externes')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedUserType === 'lecteurs-externes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Lecteurs externes ({lecteursExternes.length})
                </button>
                <button
                  onClick={() => setSelectedUserType('mediateurs')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedUserType === 'mediateurs'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Médiateurs ({mediateurs.length})
                </button>
                <button
                  onClick={() => setSelectedUserType('coordinateurs')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedUserType === 'coordinateurs'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Coordinateurs ({coordinateurs.length})
                </button>
              </div>

              {/* Actions spéciales */}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => setShowMassImport(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Import CSV/Excel
                </button>
                
                {(selectedUserType === 'eleves' || selectedUserType === 'guides') && (
                  <button
                    onClick={() => setShowClearConfirmations(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Vider tous les {selectedUserType === 'eleves' ? 'élèves' : 'guides'}
                  </button>
                )}
              </div>
            </div>

            {/* Formulaire d'ajout d'utilisateur */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Ajouter un {selectedUserType === 'eleves' ? 'élève' : 
                          selectedUserType === 'guides' ? 'guide' :
                          selectedUserType === 'lecteurs-externes' ? 'lecteur externe' :
                          selectedUserType === 'mediateurs' ? 'médiateur' : 'coordinateur'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <input
                      type="text"
                      placeholder="Catégorie"
                      value={newUser.categorie}
                      onChange={(e) => setNewUser({...newUser, categorie: e.target.value})}
                      className="border rounded px-3 py-2 text-sm"
                    />
                  </>
                )}

                {selectedUserType === 'guides' && (
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
                      placeholder="Initiale"
                      value={newUser.initiale}
                      onChange={(e) => setNewUser({...newUser, initiale: e.target.value})}
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

                {selectedUserType === 'coordinateurs' && (
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

              <div className="mt-4">
                <button
                  onClick={handleAddUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                >
                  <span>+</span>
                  <span>Ajouter</span>
                </button>
              </div>
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
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Initiale</th>
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
                            <td className="px-4 py-3 text-sm">{user.initiale}</td>
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
        )}

        {/* Modals */}
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
                    {selectedUserType === 'guides' && 'Colonnes: nom, initiale, email'}
                    {(selectedUserType === 'lecteurs-externes' || selectedUserType === 'mediateurs') && 'Colonnes: nom, prenom, email'}
                    {selectedUserType === 'coordinateurs' && 'Colonnes: nom, prenom, email'}
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
                  onClick={handleMassImport}
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




