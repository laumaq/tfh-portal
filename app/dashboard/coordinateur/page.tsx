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

interface Coordinateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

type TabType = 'convocations' | 'defenses' | 'gestion-utilisateurs';

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
  const [editingMode, setEditingMode] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newEleve, setNewEleve] = useState({
    nom: '',
    prenom: '',
    classe: '',
    problematique: '',
    categorie: '',
    guide_id: ''
  });
  const [newGuide, setNewGuide] = useState({
    nom: '',
    initiale: '',
    email: '',
    password: ''
  });
  const [newLecteurExterne, setNewLecteurExterne] = useState({
    nom: '',
    prenom: '',
    email: ''
  });
  const [newMediateur, setNewMediateur] = useState({
    nom: '',
    prenom: '',
    email: ''
  });
  const [newCoordinateur, setNewCoordinateur] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: ''
  });
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

      // Charger les médiateurs
      const { data: mediateursData, error: mediateursError } = await supabase
        .from('mediateurs')
        .select('id, nom, prenom');

      if (mediateursError) {
        console.warn('Table médiateurs non trouvée ou erreur:', mediateursError);
        setMediateurs([]);
      } else {
        setMediateurs(mediateursData || []);
      }

      // Charger les coordinateurs
      const { data: coordinateursData, error: coordinateursError } = await supabase
        .from('coordinateurs')
        .select('id, nom, prenom, email');

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
    if (!editingMode) return;
    
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
    if (!editingMode) return;
    
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
    if (!editingMode) return;
    
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

  const handleAddEleve = async () => {
    try {
      const { data, error } = await supabase
        .from('eleves')
        .insert([{
          nom: newEleve.nom,
          prenom: newEleve.prenom,
          classe: newEleve.classe,
          problematique: newEleve.problematique,
          categorie: newEleve.categorie,
          guide_id: newEleve.guide_id || null
        }])
        .select();

      if (error) throw error;

      alert('Élève ajouté avec succès!');
      setNewEleve({
        nom: '',
        prenom: '',
        classe: '',
        problematique: '',
        categorie: '',
        guide_id: ''
      });
      loadData();
    } catch (err) {
      console.error('Erreur ajout élève:', err);
      alert('Erreur lors de l\'ajout de l\'élève');
    }
  };

  const handleAddGuide = async () => {
    try {
      // Créer l'utilisateur dans l'auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newGuide.email,
        password: newGuide.password,
        options: {
          data: {
            nom: newGuide.nom,
            initiale: newGuide.initiale,
            user_type: 'guide'
          }
        }
      });

      if (authError) throw authError;

      // Ajouter dans la table guides
      const { error: guideError } = await supabase
        .from('guides')
        .insert([{
          id: authData.user?.id,
          nom: newGuide.nom,
          initiale: newGuide.initiale,
          email: newGuide.email
        }]);

      if (guideError) throw guideError;

      alert('Guide ajouté avec succès!');
      setNewGuide({
        nom: '',
        initiale: '',
        email: '',
        password: ''
      });
      loadData();
    } catch (err) {
      console.error('Erreur ajout guide:', err);
      alert('Erreur lors de l\'ajout du guide');
    }
  };

  const handleAddLecteurExterne = async () => {
    try {
      const { data, error } = await supabase
        .from('lecteurs_externes')
        .insert([{
          nom: newLecteurExterne.nom,
          prenom: newLecteurExterne.prenom,
          email: newLecteurExterne.email
        }])
        .select();

      if (error) throw error;

      alert('Lecteur externe ajouté avec succès!');
      setNewLecteurExterne({
        nom: '',
        prenom: '',
        email: ''
      });
      loadData();
    } catch (err) {
      console.error('Erreur ajout lecteur externe:', err);
      alert('Erreur lors de l\'ajout du lecteur externe');
    }
  };

  const handleAddMediateur = async () => {
    try {
      const { data, error } = await supabase
        .from('mediateurs')
        .insert([{
          nom: newMediateur.nom,
          prenom: newMediateur.prenom,
          email: newMediateur.email
        }])
        .select();

      if (error) throw error;

      alert('Médiateur ajouté avec succès!');
      setNewMediateur({
        nom: '',
        prenom: '',
        email: ''
      });
      loadData();
    } catch (err) {
      console.error('Erreur ajout médiateur:', err);
      alert('Erreur lors de l\'ajout du médiateur');
    }
  };

  const handleAddCoordinateur = async () => {
    try {
      // Créer l'utilisateur dans l'auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newCoordinateur.email,
        password: newCoordinateur.password,
        options: {
          data: {
            nom: newCoordinateur.nom,
            prenom: newCoordinateur.prenom,
            user_type: 'coordinateur'
          }
        }
      });

      if (authError) throw authError;

      // Ajouter dans la table coordinateurs
      const { error: coordError } = await supabase
        .from('coordinateurs')
        .insert([{
          id: authData.user?.id,
          nom: newCoordinateur.nom,
          prenom: newCoordinateur.prenom,
          email: newCoordinateur.email
        }]);

      if (coordError) throw coordError;

      alert('Coordinateur ajouté avec succès!');
      setNewCoordinateur({
        nom: '',
        prenom: '',
        email: '',
        password: ''
      });
      loadData();
    } catch (err) {
      console.error('Erreur ajout coordinateur:', err);
      alert('Erreur lors de l\'ajout du coordinateur');
    }
  };

  const handleDeleteEleve = async (id: string, nom: string, prenom: string) => {
    if (confirm(`Supprimer l'élève ${prenom} ${nom} ?`)) {
      try {
        const { error } = await supabase
          .from('eleves')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Élève supprimé avec succès!');
        loadData();
      } catch (err) {
        console.error('Erreur suppression élève:', err);
        alert('Erreur lors de la suppression de l\'élève');
      }
    }
  };

  const handleDeleteGuide = async (id: string, nom: string) => {
    if (confirm(`Supprimer le guide ${nom} ?`)) {
      try {
        const { error } = await supabase
          .from('guides')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Optionnel: Supprimer aussi l'utilisateur auth
        // await supabase.auth.admin.deleteUser(id);

        alert('Guide supprimé avec succès!');
        loadData();
      } catch (err) {
        console.error('Erreur suppression guide:', err);
        alert('Erreur lors de la suppression du guide');
      }
    }
  };

  const handleDeleteLecteurExterne = async (id: string, nom: string, prenom: string) => {
    if (confirm(`Supprimer le lecteur externe ${prenom} ${nom} ?`)) {
      try {
        const { error } = await supabase
          .from('lecteurs_externes')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Lecteur externe supprimé avec succès!');
        loadData();
      } catch (err) {
        console.error('Erreur suppression lecteur externe:', err);
        alert('Erreur lors de la suppression du lecteur externe');
      }
    }
  };

  const handleDeleteMediateur = async (id: string, nom: string, prenom: string) => {
    if (confirm(`Supprimer le médiateur ${prenom} ${nom} ?`)) {
      try {
        const { error } = await supabase
          .from('mediateurs')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Médiateur supprimé avec succès!');
        loadData();
      } catch (err) {
        console.error('Erreur suppression médiateur:', err);
        alert('Erreur lors de la suppression du médiateur');
      }
    }
  };

  const handleDeleteCoordinateur = async (id: string, nom: string, prenom: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le coordinateur ${prenom} ${nom} ? Cette action est irréversible.`)) {
      try {
        const { error } = await supabase
          .from('coordinateurs')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Coordinateur supprimé avec succès!');
        loadData();
      } catch (err) {
        console.error('Erreur suppression coordinateur:', err);
        alert('Erreur lors de la suppression du coordinateur');
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
                      checked={editingMode}
                      onChange={(e) => setEditingMode(e.target.checked)}
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
                      {editingMode ? 'Cliquez pour faire tourner: ? → ✓ → ✗ → ?' : 'Activez le mode édition pour modifier'}
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
                            {editingMode ? (
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
                            {editingMode ? (
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
                            {editingMode && editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                              <textarea
                                defaultValue={eleve.problematique}
                                onBlur={(e) => handleUpdate(eleve.id, 'problematique', e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                                rows={3}
                                autoFocus
                              />
                            ) : editingMode ? (
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
                            {editingMode ? (
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
                            {editingMode ? (
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
                            {editingMode ? (
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
                            {editingMode ? (
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
                            {editingMode ? (
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
                            {editingMode ? (
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
                          disabled={!editingMode}
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
                          disabled={!editingMode}
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
                          disabled={!editingMode || mediateurs.length === 0}
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
                            disabled={!editingMode}
                          />
                          {editingMode && eleve.date_defense && (
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
                            disabled={!editingMode}
                          />
                          {editingMode && eleve.heure_defense && (
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
                            disabled={!editingMode}
                          />
                          {editingMode && eleve.localisation_defense && (
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
        ) : (
          /* Onglet Gestion des Utilisateurs */
          <div className="space-y-8">
            {/* Section Ajout d'utilisateurs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Ajouter de nouveaux utilisateurs</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Ajouter un élève */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Ajouter un élève</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newEleve.nom}
                      onChange={(e) => setNewEleve({...newEleve, nom: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newEleve.prenom}
                      onChange={(e) => setNewEleve({...newEleve, prenom: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Classe"
                      value={newEleve.classe}
                      onChange={(e) => setNewEleve({...newEleve, classe: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Catégorie"
                      value={newEleve.categorie}
                      onChange={(e) => setNewEleve({...newEleve, categorie: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <select
                      value={newEleve.guide_id}
                      onChange={(e) => setNewEleve({...newEleve, guide_id: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    >
                      <option value="">Sélectionner un guide</option>
                      {guides.map(guide => (
                        <option key={guide.id} value={guide.id}>
                          {guide.nom} {guide.initiale}.
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddEleve}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Ajouter l'élève
                    </button>
                  </div>
                </div>

                {/* Ajouter un guide */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Ajouter un guide</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newGuide.nom}
                      onChange={(e) => setNewGuide({...newGuide, nom: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Initiale"
                      value={newGuide.initiale}
                      onChange={(e) => setNewGuide({...newGuide, initiale: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newGuide.email}
                      onChange={(e) => setNewGuide({...newGuide, email: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      value={newGuide.password}
                      onChange={(e) => setNewGuide({...newGuide, password: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <button
                      onClick={handleAddGuide}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Ajouter le guide
                    </button>
                  </div>
                </div>

                {/* Ajouter un lecteur externe */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Ajouter un lecteur externe</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newLecteurExterne.nom}
                      onChange={(e) => setNewLecteurExterne({...newLecteurExterne, nom: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newLecteurExterne.prenom}
                      onChange={(e) => setNewLecteurExterne({...newLecteurExterne, prenom: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newLecteurExterne.email}
                      onChange={(e) => setNewLecteurExterne({...newLecteurExterne, email: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <button
                      onClick={handleAddLecteurExterne}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Ajouter le lecteur
                    </button>
                  </div>
                </div>

                {/* Ajouter un médiateur */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Ajouter un médiateur</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newMediateur.nom}
                      onChange={(e) => setNewMediateur({...newMediateur, nom: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newMediateur.prenom}
                      onChange={(e) => setNewMediateur({...newMediateur, prenom: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newMediateur.email}
                      onChange={(e) => setNewMediateur({...newMediateur, email: e.target.value})}
                      className="w-full border rounded px-3 py-1 text-sm"
                    />
                    <button
                      onClick={handleAddMediateur}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Ajouter le médiateur
                    </button>
                  </div>
                </div>
              </div>

              {/* Ajouter un coordinateur */}
              <div className="mt-6 border rounded-lg p-4 max-w-md">
                <h3 className="font-medium text-gray-700 mb-3">Ajouter un coordinateur</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newCoordinateur.nom}
                    onChange={(e) => setNewCoordinateur({...newCoordinateur, nom: e.target.value})}
                    className="w-full border rounded px-3 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={newCoordinateur.prenom}
                    onChange={(e) => setNewCoordinateur({...newCoordinateur, prenom: e.target.value})}
                    className="w-full border rounded px-3 py-1 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newCoordinateur.email}
                    onChange={(e) => setNewCoordinateur({...newCoordinateur, email: e.target.value})}
                    className="w-full border rounded px-3 py-1 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={newCoordinateur.password}
                    onChange={(e) => setNewCoordinateur({...newCoordinateur, password: e.target.value})}
                    className="w-full border rounded px-3 py-1 text-sm"
                  />
                  <button
                    onClick={handleAddCoordinateur}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Ajouter le coordinateur
                  </button>
                </div>
              </div>
            </div>

            {/* Section Liste des utilisateurs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Liste des utilisateurs</h2>
              
              {/* Élèves */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Élèves ({eleves.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Classe</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Prénom</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Catégorie</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Guide</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eleves.slice(0, 10).map((eleve) => (
                        <tr key={eleve.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{eleve.classe}</td>
                          <td className="px-4 py-2 text-sm">{eleve.nom}</td>
                          <td className="px-4 py-2 text-sm">{eleve.prenom}</td>
                          <td className="px-4 py-2 text-sm">{eleve.categorie || '-'}</td>
                          <td className="px-4 py-2 text-sm">{eleve.guide_nom} {eleve.guide_initiale}.</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteEleve(eleve.id, eleve.nom, eleve.prenom)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                      {eleves.length > 10 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-2 text-sm text-gray-500 text-center">
                            ... et {eleves.length - 10} autres élèves
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Guides */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Guides ({guides.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Initiale</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guides.map((guide) => (
                        <tr key={guide.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{guide.nom}</td>
                          <td className="px-4 py-2 text-sm">{guide.initiale}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteGuide(guide.id, guide.nom)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lecteurs externes */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Lecteurs externes ({lecteursExternes.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Prénom</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lecteursExternes.map((lecteur) => (
                        <tr key={lecteur.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{lecteur.nom}</td>
                          <td className="px-4 py-2 text-sm">{lecteur.prenom}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteLecteurExterne(lecteur.id, lecteur.nom, lecteur.prenom)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Médiateurs */}
              {mediateurs.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">Médiateurs ({mediateurs.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Prénom</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mediateurs.map((mediateur) => (
                          <tr key={mediateur.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{mediateur.nom}</td>
                            <td className="px-4 py-2 text-sm">{mediateur.prenom}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleDeleteMediateur(mediateur.id, mediateur.nom, mediateur.prenom)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Coordinateurs */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Coordinateurs ({coordinateurs.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Prénom</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Email</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coordinateurs.map((coordinateur) => (
                        <tr key={coordinateur.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{coordinateur.nom}</td>
                          <td className="px-4 py-2 text-sm">{coordinateur.prenom}</td>
                          <td className="px-4 py-2 text-sm">{coordinateur.email}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteCoordinateur(coordinateur.id, coordinateur.nom, coordinateur.prenom)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
