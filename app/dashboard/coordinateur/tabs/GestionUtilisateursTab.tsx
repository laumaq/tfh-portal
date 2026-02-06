// app/dashboard/coordinateur/tabs/GestionUtilisateursTab.tsx
'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { Plus, Upload, Trash2, UserPlus, AlertTriangle, Check, Lock, Unlock, CheckCircle, XCircle } from 'lucide-react';
import { Eleve, Guide, LecteurExterne, Mediateur, Coordinateur } from '../types';

interface GestionUtilisateursTabProps {
  eleves: Eleve[];
  guides: Guide[];
  lecteursExternes: LecteurExterne[];
  mediateurs: Mediateur[];
  coordinateurs: Coordinateur[];
  onRefresh: () => void;
}

type UserType = 'eleves' | 'guides' | 'lecteurs-externes' | 'mediateurs' | 'coordinateurs';

interface NewUser {
  nom: string;
  prenom: string;
  classe: string;
  email: string;
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
  lecteursExternes,
  mediateurs,
  coordinateurs,
  onRefresh
}: GestionUtilisateursTabProps) {
  const [selectedUserType, setSelectedUserType] = useState<UserType>('eleves');
  const [newUser, setNewUser] = useState<NewUser>({
    nom: '',
    prenom: '',
    classe: '',
    email: '',
    initiale: '',
    categorie: ''
  });
  const [showMassImport, setShowMassImport] = useState(false);
  const [massImportData, setMassImportData] = useState<string>('');
  const [showClearConfirmations, setShowClearConfirmations] = useState(false);
  const [clearConfirmations, setClearConfirmations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deletePasswordModal, setDeletePasswordModal] = useState<DeletePasswordModalState>({
    isOpen: false,
    userId: null,
    userName: '',
    userType: null
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effacer les messages après 3 secondes
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
    return getCurrentUsers().length;
  };

  const handleAddUser = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      // Vérifier les champs requis
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
              mot_de_passe: null // Initialisé à null
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
              mot_de_passe: null // Initialisé à null
            }]);

          if (guideError) throw guideError;
          break;

        case 'lecteurs-externes':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un lecteur externe');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const { error: lecteurError } = await supabase
            .from('lecteurs_externes')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || null,
              mot_de_passe: null // Initialisé à null
            }]);

          if (lecteurError) throw lecteurError;
          break;

        case 'mediateurs':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un médiateur');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const { error: mediateurError } = await supabase
            .from('mediateurs')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || null,
              mot_de_passe: null // Initialisé à null
            }]);

          if (mediateurError) throw mediateurError;
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
              mot_de_passe: null // Initialisé à null
            }]);

          if (coordError) {
            console.error('Erreur détaillée coordinateur:', coordError);
            throw coordError;
          }
          break;
      }

      setSuccessMessage('Utilisateur ajouté avec succès!');
      clearMessages();
      
      // Réinitialiser le formulaire
      setNewUser({
        nom: '',
        prenom: '',
        classe: '',
        email: '',
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
        case 'lecteurs-externes':
          tableName = 'lecteurs_externes';
          break;
        case 'mediateurs':
          tableName = 'mediateurs';
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

  // Fonction pour vérifier si l'utilisateur a un mot de passe (s'est connecté)
  const hasPassword = (user: any): boolean => {
    return user.mot_de_passe !== null && user.mot_de_passe !== '';
  };

  // Fonction pour rendre l'indicateur de connexion
  const renderConnectionStatus = (user: any) => {
    const connected = hasPassword(user);
    
    return (
      <div className="flex items-center gap-2">
        {connected ? (
          <button
            className="p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
            title="Utilisateur connecté"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        ) : (
          <button
            className="p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
            title="Utilisateur non connecté"
          >
            <XCircle className="w-4 h-4" />
          </button>
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
        setErrorMessage('Erreur lors de la lecture du fichier');
        clearMessages();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMassImport = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const rows = massImportData.trim().split('\n').filter(row => row.trim());
      if (rows.length === 0) {
        setErrorMessage('Aucune donnée à importer');
        clearMessages();
        setLoading(false);
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
              guide_id: null,
              mot_de_passe: null // Toujours null à l'import
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

        case 'guides':
          const guidesToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const guideData: any = {
              nom: values[0] || '',
              prenom: values[1] || '',
              initiale: (values[1] || '').charAt(0).toUpperCase(),
              mot_de_passe: null // Toujours null à l'import
            };
            return guideData;
          }).filter(g => g.nom && g.prenom);

          if (guidesToInsert.length > 0) {
            const { error } = await supabase
              .from('guides')
              .insert(guidesToInsert);
            if (error) throw error;
          }
          break;

        case 'lecteurs-externes':
          const lecteursToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            return {
              nom: values[0] || '',
              prenom: values[1] || '',
              email: values[2] || null,
              mot_de_passe: null // Toujours null à l'import
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
              email: values[2] || null,
              mot_de_passe: null // Toujours null à l'import
            };
          }).filter(m => m.nom && m.prenom);

          if (mediateursToInsert.length > 0) {
            const { error } = await supabase
              .from('mediateurs')
              .insert(mediateursToInsert);
            if (error) throw error;
          }
          break;

        case 'coordinateurs':
          const coordinateursToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const coordData: any = {
              nom: values[0] || '',
              prenom: values[1] || '',
              mot_de_passe: null // Toujours null à l'import
            };
            
            if (values[1]) {
              coordData.initiale = values[1].charAt(0).toUpperCase();
            }
            
            return coordData;
          }).filter(c => c.nom && c.prenom);

          if (coordinateursToInsert.length > 0) {
            const { error } = await supabase
              .from('coordinateurs')
              .insert(coordinateursToInsert);
            if (error) throw error;
          }
          break;
      }

      setSuccessMessage(`${dataRows.length} utilisateur${dataRows.length > 1 ? 's' : ''} importé${dataRows.length > 1 ? 's' : ''} avec succès!`);
      clearMessages();
      setShowMassImport(false);
      setMassImportData('');
      onRefresh();
    } catch (err) {
      console.error('Erreur import massif:', err);
      setErrorMessage('Erreur lors de l\'importation: ' + (err as Error).message);
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async (type: 'eleves' | 'guides') => {
    const userName = localStorage.getItem('userName') || '';
    
    if (!clearConfirmations.includes(userName)) {
      setClearConfirmations([...clearConfirmations, userName]);
      setSuccessMessage(`Confirmation 1/3 enregistrée. Demandez à 2 autres coordinateurs de confirmer.`);
      clearMessages();
      return;
    }

    if (clearConfirmations.length < 2) {
      setSuccessMessage(`Confirmation ${clearConfirmations.length}/3 enregistrée. ${3 - clearConfirmations.length} confirmation(s) restante(s).`);
      clearMessages();
      return;
    }

    // 3 confirmations reçues
    try {
      if (type === 'eleves') {
        const { error } = await supabase
          .from('eleves')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      } else if (type === 'guides') {
        const { error } = await supabase
          .from('guides')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }

      setSuccessMessage(`Tous les ${type} ont été supprimés avec succès!`);
      clearMessages();
      setShowClearConfirmations(false);
      setClearConfirmations([]);
      onRefresh();
    } catch (err) {
      console.error(`Erreur suppression ${type}:`, err);
      setErrorMessage(`Erreur lors de la suppression des ${type}`);
      clearMessages();
    }
  };

  const getUserTypeLabel = () => {
    switch (selectedUserType) {
      case 'eleves': return 'Élèves';
      case 'guides': return 'Guides';
      case 'lecteurs-externes': return 'Lecteurs externes';
      case 'mediateurs': return 'Médiateurs';
      case 'coordinateurs': return 'Coordinateurs';
      default: return '';
    }
  };

  // Rendu des messages
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
      
      {/* En-tête */}
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

      {/* Section d'ajout d'utilisateur */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'utilisateur
            </label>
            <select
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value as UserType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="eleves">Élève</option>
              <option value="guides">Guide</option>
              <option value="lecteurs-externes">Lecteur externe</option>
              <option value="mediateurs">Médiateur</option>
              <option value="coordinateurs">Coordinateur</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import / Suppression
            </label>
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
          </div>
        </div>
        
        {/* Formulaire d'ajout */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Ajouter un {getUserTypeLabel().toLowerCase()}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {selectedUserType === 'eleves' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Classe *
                  </label>
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
            
            {(selectedUserType === 'lecteurs-externes' || selectedUserType === 'mediateurs') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            
            {(selectedUserType === 'guides' || selectedUserType === 'coordinateurs') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Bouton Ajouter */}
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
      </div>

      {/* Liste des utilisateurs */}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Classe
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
                {selectedUserType === 'guides' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
                {selectedUserType === 'lecteurs-externes' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
                {selectedUserType === 'mediateurs' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
                {selectedUserType === 'coordinateurs' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getCurrentUsers().map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  {selectedUserType === 'eleves' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.classe}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)}
                          className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors flex items-center gap-1"
                          title="Supprimer l'utilisateur"
                        >
                          ✕
                        </button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'guides' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom)}
                          className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors flex items-center gap-1"
                          title="Supprimer l'utilisateur"
                        >
                          ✕
                        </button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'lecteurs-externes' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.email || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)}
                          className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors flex items-center gap-1"
                          title="Supprimer l'utilisateur"
                        >
                          ✕
                        </button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'mediateurs' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.email || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)}
                          className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors flex items-center gap-1"
                          title="Supprimer l'utilisateur"
                        >
                          ✕
                        </button>
                      </td>
                    </>
                  )}
                  {selectedUserType === 'coordinateurs' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.nom, user.prenom)}
                          className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-sm transition-colors flex items-center gap-1"
                          title="Supprimer l'utilisateur"
                        >
                          ✕
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

      {/* Modal d'import massif */}
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

      {/* Modal de confirmation pour suppression massive */}
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

      {/* Modal de confirmation pour suppression de mot de passe */}
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
