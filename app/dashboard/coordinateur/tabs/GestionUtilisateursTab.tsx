// /app/dashboard/coordinateur/tabs/GestionUtilisateursTab.tsx

'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { Plus, Upload, Trash2, UserPlus, AlertTriangle, Check, Lock, Unlock, CheckCircle, XCircle, Phone, Mail } from 'lucide-react';
import { Eleve, Guide, Externe, Coordinateur } from '../types';

interface GestionUtilisateursTabProps {
  eleves: Eleve[];
  guides: Guide[];
  externes: Externe[];
  coordinateurs: Coordinateur[];
  onRefresh: () => void;
}

type UserType = 'eleves' | 'guides' | 'externes' | 'coordinateurs' | 'direction';

interface NewUser {
  nom: string;
  prenom: string;
  classe: string;
  email: string;
  telephone: string;
  initiale: string;
  categorie: string;
}

interface DeletePasswordModalState {
  isOpen: boolean;
  userId: string | null;
  userName: string;
  userType: UserType | null;
}

export default function GestionUtilisateursTab({
  eleves,
  guides,
  externes,
  coordinateurs,
  onRefresh
}: GestionUtilisateursTabProps) {
  const [selectedUserType, setSelectedUserType] = useState<UserType>('eleves');
  const [newUser, setNewUser] = useState<NewUser>({
    nom: '',
    prenom: '',
    classe: '',
    email: '',
    telephone: '',
    initiale: '',
    categorie: ''
  });
  const [showMassImport, setShowMassImport] = useState(false);
  const [massImportData, setMassImportData] = useState<string>('');
  const [showClearConfirmations, setShowClearConfirmations] = useState(false);
  const [clearConfirmations, setClearConfirmations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [directionMembers, setDirectionMembers] = useState<any[]>([]);
  const [directionGuides, setDirectionGuides] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deletePasswordModal, setDeletePasswordModal] = useState<DeletePasswordModalState>({
    isOpen: false,
    userId: null,
    userName: '',
    userType: null
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearMessages = () => {
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const getCurrentUsers = () => {
    switch (selectedUserType) {
      case 'eleves':
        return eleves;
      case 'guides':
        return guides;
      case 'externes':
        return externes;
      case 'coordinateurs':
        return coordinateurs;
      case 'direction':
        return directionGuides;
      default:
        return [];
    }
  };

  const getCurrentUserCount = () => {
    if (selectedUserType === 'direction') {
      return directionMembers.length;
    }
    return getCurrentUsers().length;
  };

  const handleAddUser = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      if (!newUser.nom.trim()) {
        setErrorMessage('Le nom est requis');
        clearMessages();
        setLoading(false);
        return;
      }

      if (!newUser.prenom.trim() && selectedUserType !== 'guides' && selectedUserType !== 'coordinateurs') {
        setErrorMessage('Le prénom est requis');
        clearMessages();
        setLoading(false);
        return;
      }

      switch (selectedUserType) {
        case 'eleves':
          if (!newUser.classe.trim()) {
            setErrorMessage('La classe est requise pour un élève');
            clearMessages();
            setLoading(false);
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
              guide_id: null,
              mot_de_passe: null
            }]);

          if (eleveError) throw eleveError;
          break;

        case 'guides':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un guide');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const initialeGuide = newUser.prenom.trim().charAt(0).toUpperCase();
          
          const { error: guideError } = await supabase
            .from('guides')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              initiale: initialeGuide,
              email: newUser.email || null,
              mot_de_passe: null
            }]);

          if (guideError) throw guideError;
          break;

        case 'externes':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un externe');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const { error: externeError } = await supabase
            .from('externes')
            .insert([{
              id: crypto.randomUUID(),
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || null,
              telephone: newUser.telephone || null,
              mot_de_passe: null
            }]);

          if (externeError) throw externeError;
          break;

        case 'coordinateurs':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un coordinateur');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const initialeCoord = newUser.prenom.trim().charAt(0).toUpperCase();
          
          const { error: coordError } = await supabase
            .from('coordinateurs')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              initiale: initialeCoord,
              mot_de_passe: null
            }]);

          if (coordError) throw coordError;
          break;
      }

      setSuccessMessage('Utilisateur ajouté avec succès!');
      clearMessages();
      
      setNewUser({
        nom: '',
        prenom: '',
        classe: '',
        email: '',
        telephone: '',
        initiale: '',
        categorie: ''
      });
      
      onRefresh();
    } catch (err) {
      console.error('Erreur ajout utilisateur:', err);
      setErrorMessage('Erreur lors de l\'ajout de l\'utilisateur: ' + (err as Error).message);
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const loadDirectionData = useCallback(async () => {
    try {
      const { data: guidesData, error: guidesError } = await supabase
        .from('guides')
        .select('*')
        .order('nom', { ascending: true });
      
      if (guidesError) throw guidesError;
      
      const { data: directionData, error: directionError } = await supabase
        .from('direction')
        .select('guide_id');
      
      if (directionError) throw directionError;
      
      const directionGuideIds = directionData?.map(d => d.guide_id) || [];
      
      const guidesWithDirection = (guidesData || []).map(guide => ({
        ...guide,
        isInDirection: directionGuideIds.includes(guide.id)
      }));
      
      guidesWithDirection.sort((a, b) => {
        if (a.isInDirection && !b.isInDirection) return -1;
        if (!a.isInDirection && b.isInDirection) return 1;
        return 0;
      });
      
      setDirectionGuides(guidesWithDirection);
      setDirectionMembers(directionGuideIds);
      
    } catch (err) {
      console.error('Erreur chargement direction:', err);
      setDirectionGuides([]);
      setDirectionMembers([]);
    }
  }, []);

  const handleDirectionToggle = async (guideId: string, newCheckedValue: boolean) => {
    setLoading(true);
    try {
      const isCurrentlyInDirection = directionMembers.includes(guideId);
      
      if (newCheckedValue === isCurrentlyInDirection) {
        setLoading(false);
        return;
      }
      
      if (newCheckedValue) {
        const { error } = await supabase
          .from('direction')
          .insert([{ guide_id: guideId }]);
        
        if (error) {
          if (error.code === '23505') {
            setErrorMessage('Ce guide est déjà dans la direction');
          } else {
            throw error;
          }
        } else {
          setDirectionMembers(prev => [...prev, guideId]);
          setDirectionGuides(prev => prev.map(g => 
            g.id === guideId ? { ...g, isInDirection: true } : g
          ));
          setSuccessMessage('Guide ajouté à la direction');
        }
      } else {
        const { error } = await supabase
          .from('direction')
          .delete()
          .eq('guide_id', guideId);
        
        if (error) throw error;
        
        setDirectionMembers(prev => prev.filter(id => id !== guideId));
        setDirectionGuides(prev => prev.map(g => 
          g.id === guideId ? { ...g, isInDirection: false } : g
        ));
        setSuccessMessage('Guide retiré de la direction');
      }
      clearMessages();
    } catch (err) {
      console.error('Erreur mise à jour direction:', err);
      setErrorMessage('Erreur lors de la mise à jour de la direction');
      clearMessages();
    } finally {
      setLoading(false);
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
          case 'externes':
            await supabase.from('externes').delete().eq('id', id);
            break;
          case 'coordinateurs':
            await supabase.from('coordinateurs').delete().eq('id', id);
            break;
        }

        setSuccessMessage('Utilisateur supprimé avec succès!');
        clearMessages();
        onRefresh();
      } catch (err) {
        console.error('Erreur suppression utilisateur:', err);
        setErrorMessage('Erreur lors de la suppression de l\'utilisateur');
        clearMessages();
      }
    }
  };

  const handleDeletePassword = async () => {
    if (!deletePasswordModal.userId || !deletePasswordModal.userType) return;

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      let tableName = '';
      switch (deletePasswordModal.userType) {
        case 'eleves':
          tableName = 'eleves';
          break;
        case 'guides':
          tableName = 'guides';
          break;
        case 'externes':
          tableName = 'externes';
          break;
        case 'coordinateurs':
          tableName = 'coordinateurs';
          break;
      }

      const { error } = await supabase
        .from(tableName)
        .update({ mot_de_passe: null })
        .eq('id', deletePasswordModal.userId);

      if (error) throw error;

      setSuccessMessage(`Mot de passe supprimé pour ${deletePasswordModal.userName}`);
      clearMessages();
      setDeletePasswordModal({
        isOpen: false,
        userId: null,
        userName: '',
        userType: null
      });
      onRefresh();
    } catch (err) {
      console.error('Erreur suppression mot de passe:', err);
      setErrorMessage('Erreur lors de la suppression du mot de passe');
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const openDeletePasswordModal = (userId: string, userName: string, userType: UserType) => {
    setDeletePasswordModal({
      isOpen: true,
      userId,
      userName,
      userType
    });
  };

  const closeDeletePasswordModal = () => {
    setDeletePasswordModal({
      isOpen: false,
      userId: null,
      userName: '',
      userType: null
    });
  };

  const hasPassword = (user: any): boolean => {
    return user.mot_de_passe !== null && user.mot_de_passe !== undefined && user.mot_de_passe !== '';
  };

  const renderConnectionStatus = (user: any) => {
    const connected = hasPassword(user);
    
    return (
      <div className="flex items-center gap-2">
        {connected ? (
          <div className="p-1.5 bg-green-100 text-green-700 rounded-full" title="Utilisateur connecté">
            <CheckCircle className="w-4 h-4" />
          </div>
        ) : (
          <div className="p-1.5 bg-red-100 text-red-700 rounded-full" title="Utilisateur non connecté">
            <XCircle className="w-4 h-4" />
          </div>
        )}
        <button
          onClick={() => openDeletePasswordModal(
            user.id,
            user.prenom ? `${user.prenom} ${user.nom}` : user.nom,
            selectedUserType
          )}
          className="p-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          title="Supprimer le mot de passe"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const getUserTypeLabel = () => {
    switch (selectedUserType) {
      case 'eleves': return 'Élèves';
      case 'guides': return 'Guides';
      case 'externes': return 'Externes';
      case 'coordinateurs': return 'Coordinateurs';
      case 'direction': return 'Membres direction';
      default: return '';
    }
  };

  const renderMessages = () => {
    if (!successMessage && !errorMessage) return null;

    return (
      <div className="fixed top-4 right-4 z-50 max-w-md">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">{successMessage}</span>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderMessages()}
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Gestion des utilisateurs
            </h2>
            <p className="text-gray-600">
              Ajout, modification et suppression des utilisateurs du système
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {getCurrentUserCount()} {getUserTypeLabel().toLowerCase()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'utilisateur
            </label>
            <select
              value={selectedUserType}
              onChange={(e) => {
                setSelectedUserType(e.target.value as UserType);
                if (e.target.value === 'direction') {
                  loadDirectionData();
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="eleves">Élèves</option>
              <option value="guides">Guides</option>
              <option value="externes">Externes</option>
              <option value="coordinateurs">Coordinateurs</option>
              <option value="direction">Direction</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import / Suppression
            </label>
            {selectedUserType !== 'direction' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMassImport(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Importer CSV
                </button>
                {(selectedUserType === 'eleves' || selectedUserType === 'guides') && (
                  <button
                    onClick={() => setShowClearConfirmations(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Tout supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {selectedUserType !== 'direction' && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Ajouter un {getUserTypeLabel().toLowerCase()}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {selectedUserType === 'eleves' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Classe *</label>
                    <input
                      type="text"
                      placeholder="Classe"
                      value={newUser.classe}
                      onChange={(e) => setNewUser({...newUser, classe: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              
              {selectedUserType === 'externes' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={newUser.telephone}
                      onChange={(e) => setNewUser({...newUser, telephone: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              
              {(selectedUserType === 'guides' || selectedUserType === 'coordinateurs') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {selectedUserType === 'guides' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        placeholder="Email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleAddUser}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Ajout en cours...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Ajouter
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">
              Liste des {getUserTypeLabel().toLowerCase()} ({getCurrentUserCount()})
            </h3>
            <span className="text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 inline text-green-600 mr-1" /> = Connecté
              <XCircle className="w-4 h-4 inline text-red-600 mr-1 ml-3" /> = Non connecté
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {selectedUserType === 'eleves' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Classe</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'guides' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'externes' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Téléphone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'coordinateurs' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'direction' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Membre direction</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getCurrentUsers().map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  {selectedUserType === 'eleves' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.classe}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'guides' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.email ? (
                          <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'externes' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.email ? (
                          <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.telephone ? (
                          <a href={`tel:${user.telephone.replace(/\s/g, '')}`} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.telephone}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'coordinateurs' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'direction' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user.isInDirection || false}
                            onChange={(e) => handleDirectionToggle(user.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            disabled={loading}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {user.isInDirection ? 'Membre' : 'Non membre'}
                          </span>
                        </label>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                  Format attendu pour les {getUserTypeLabel().toLowerCase()}:
                </label>
                <div className="text-sm text-gray-600 mb-3">
                  {selectedUserType === 'eleves' && 'Colonnes: nom, prenom, classe, categorie (optionnel)'}
                  {selectedUserType === 'guides' && 'Colonnes: nom, prenom, email (optionnel)'}
                  {selectedUserType === 'externes' && 'Colonnes: nom, prenom, email, telephone'}
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
                onClick={handleMassImport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!massImportData.trim() || loading}
              >
                {loading ? 'Importation...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirmations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-semibold text-red-800">
                ⚠️ Confirmation nécessaire
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
                      <div className="mt-1 space-y-1">
                        {clearConfirmations.map((name, index) => (
                          <div key={index} className="text-xs">• {name}</div>
                        ))}
                      </div>
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

      {deletePasswordModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b bg-yellow-50">
              <h3 className="text-lg font-semibold text-yellow-800">
                🔐 Supprimer le mot de passe
              </h3>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-3">
                  Vous êtes sur le point de supprimer le mot de passe de <strong>{deletePasswordModal.userName}</strong>.
                </p>
                
                <p className="text-sm text-gray-600 mb-4">
                  Cette action permettra à l'utilisateur de créer un nouveau mot de passe lors de sa prochaine connexion.
                  Elle est utile si l'utilisateur a oublié son mot de passe.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>⚠️ Attention :</strong> L'utilisateur devra réinitialiser son mot de passe pour pouvoir se reconnecter.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={closeDeletePasswordModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleDeletePassword}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Suppression...' : 'Supprimer le mot de passe'}
              </button>

  return (
    <div className="space-y-6">
      {renderMessages()}
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Gestion des utilisateurs
            </h2>
            <p className="text-gray-600">
              Ajout, modification et suppression des utilisateurs du système
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {getCurrentUserCount()} {getUserTypeLabel().toLowerCase()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'utilisateur
            </label>
            <select
              value={selectedUserType}
              onChange={(e) => {
                setSelectedUserType(e.target.value as UserType);
                if (e.target.value === 'direction') {
                  loadDirectionData();
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="eleves">Élèves</option>
              <option value="guides">Guides</option>
              <option value="externes">Externes</option>
              <option value="coordinateurs">Coordinateurs</option>
              <option value="direction">Direction</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import / Suppression
            </label>
            {selectedUserType !== 'direction' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMassImport(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Importer CSV
                </button>
                {(selectedUserType === 'eleves' || selectedUserType === 'guides') && (
                  <button
                    onClick={() => setShowClearConfirmations(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Tout supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {selectedUserType !== 'direction' && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Ajouter un {getUserTypeLabel().toLowerCase()}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {selectedUserType === 'eleves' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Classe *</label>
                    <input
                      type="text"
                      placeholder="Classe"
                      value={newUser.classe}
                      onChange={(e) => setNewUser({...newUser, classe: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              
              {selectedUserType === 'externes' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={newUser.telephone}
                      onChange={(e) => setNewUser({...newUser, telephone: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              
              {(selectedUserType === 'guides' || selectedUserType === 'coordinateurs') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {selectedUserType === 'guides' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        placeholder="Email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleAddUser}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Ajout en cours...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Ajouter
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">
              Liste des {getUserTypeLabel().toLowerCase()} ({getCurrentUserCount()})
            </h3>
            <span className="text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 inline text-green-600 mr-1" /> = Connecté
              <XCircle className="w-4 h-4 inline text-red-600 mr-1 ml-3" /> = Non connecté
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {selectedUserType === 'eleves' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Classe</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'guides' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'externes' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Téléphone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'coordinateurs' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {selectedUserType === 'direction' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prénom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Connecté</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Membre direction</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getCurrentUsers().map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  {selectedUserType === 'eleves' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.classe}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'guides' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.email ? (
                          <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'externes' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.email ? (
                          <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.telephone ? (
                          <a href={`tel:${user.telephone.replace(/\s/g, '')}`} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.telephone}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'coordinateurs' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors">✕</button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'direction' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.prenom}</td>
                      <td className="px-4 py-3">{renderConnectionStatus(user)}</td>
                      <td className="px-4 py-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user.isInDirection || false}
                            onChange={(e) => handleDirectionToggle(user.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            disabled={loading}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {user.isInDirection ? 'Membre' : 'Non membre'}
                          </span>
                        </label>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showMassImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Import massif depuis CSV/Excel</h3>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format attendu pour les {getUserTypeLabel().toLowerCase()}:
                  </label>
                  <div className="text-sm text-gray-600 mb-3">
                    {selectedUserType === 'eleves' && 'Colonnes: nom, prenom, classe, categorie (optionnel)'}
                    {selectedUserType === 'guides' && 'Colonnes: nom, prenom, email (optionnel)'}
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
                  onClick={handleMassImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!massImportData.trim() || loading}
                >
                  {loading ? 'Importation...' : 'Importer'}
                </button>
              </div>
            </div>
          </div>
        )}
  
        {showClearConfirmations && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b bg-red-50">
                <h3 className="text-lg font-semibold text-red-800">
                  ⚠️ Confirmation nécessaire
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
                        <div className="mt-1 space-y-1">
                          {clearConfirmations.map((name, index) => (
                            <div key={index} className="text-xs">• {name}</div>
                          ))}
                        </div>
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
  
        {deletePasswordModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b bg-yellow-50">
                <h3 className="text-lg font-semibold text-yellow-800">
                  🔐 Supprimer le mot de passe
                </h3>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-700 mb-3">
                    Vous êtes sur le point de supprimer le mot de passe de <strong>{deletePasswordModal.userName}</strong>.
                  </p>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Cette action permettra à l'utilisateur de créer un nouveau mot de passe lors de sa prochaine connexion.
                    Elle est utile si l'utilisateur a oublié son mot de passe.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>⚠️ Attention :</strong> L'utilisateur devra réinitialiser son mot de passe pour pouvoir se reconnecter.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={closeDeletePasswordModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeletePassword}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Suppression...' : 'Supprimer le mot de passe'}
                </button>
              </div>
            </div>
          </div>
        )}      
    </div>
  );
}
