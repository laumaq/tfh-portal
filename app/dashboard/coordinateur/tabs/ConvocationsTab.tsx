'use client';

import { supabase } from '@/lib/supabase';
import React from 'react';
import { useState, useEffect } from 'react';
import { Eleve, Guide } from '../types';
import { CONVOCATION_OPTIONS } from '../constants';
import { 
  getConvocationColor, 
  getConvocationLabel, 
  getPresenceStyles
} from '../utils/convocationUtils';
import { 
  getJourneesFromSupabase, 
  detecterSessions, 
  estConvoque, 
  getStatutSession,
  mettreAJourPresence,
  mettreAJourConvocation,
  type Session
} from '../utils/sessionUtils';

interface ConvocationsTabProps {
  eleves: Eleve[];
  guides: Guide[];
  categories: string[];
  editingMode: boolean;
  editingCell: {id: string, field: string} | null;
  onUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onSelectUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onPresenceUpdate: (
    eleveId: string, 
    field: string, 
    currentValue: boolean | null,
    onSuccess?: (newValue: boolean | null) => void // ← Optionnel maintenant
  ) => Promise<void>;
  onRefresh: () => void;
  onSetEditingCell: (cell: {id: string, field: string} | null) => void;
  onSetEditingMode: (mode: boolean) => void;
  onUpdateEleve?: (eleve: Eleve) => void;
}

export default function ConvocationsTab({
  eleves,
  guides,
  categories,
  editingMode,
  editingCell,
  onUpdate,
  onSelectUpdate,
  onPresenceUpdate,
  onRefresh,
  onSetEditingCell,
  onSetEditingMode,
  onUpdateEleve
}: ConvocationsTabProps) {
  const [newCategory, setNewCategory] = useState('');
  const [showConvoques, setShowConvoques] = useState(false);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [journees, setJournees] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  // Synchroniser les données locales avec les données parent
  useEffect(() => {
    console.log('Sessions détectées:', sessions);
    console.log('Journées:', journees);
    console.log('Premier élève:', eleves[0] ? {
      id: eleves[0].id,
      nom: eleves[0].nom,
      session_3_convoque: (eleves[0] as any).session_3_convoque,
      session_4_convoque: (eleves[0] as any).session_4_convoque,
      journee_4_present: eleves[0].journee_4_present,
      journee_5_present: eleves[0].journee_5_present,
    } : 'Aucun élève');
  }, [sessions, journees, eleves]);

  useEffect(() => {
  const chargerSessions = async () => {
    setLoadingSessions(true);
    try {
      // Charger les journées depuis system_settings
      const journeesData = await getJourneesFromSupabase(supabase);
      setJournees(journeesData);
      
      // Détecter les sessions automatiquement
      const sessionsDetectees = detecterSessions(journeesData);
      setSessions(sessionsDetectees);
      
      // Avertissement si trop de sessions
      if (sessionsDetectees.length > 20) {
        console.error(`⚠️ ATTENTION : ${sessionsDetectees.length} sessions détectées (max: 20)`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };
  
  chargerSessions();
}, []);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      // Cette fonctionnalité sera implémentée plus tard
      alert('Ajout de catégorie à implémenter');
      setNewCategory('');
    }
  };


  const handleSave = async (eleve: Eleve, onUpdateEleve?: (eleve: Eleve) => void) => {
    setIsProcessing(true);
    try {
      const updateData: any = {};
      
      // Ne sauvegarder que les sessions qui existent dans l'objet eleve
      for (let i = 1; i <= 20; i++) {
        const sessionKey = `session_${i}_convoque` as keyof Eleve;
        if (sessionKey in eleve) { // Seulement si la propriété existe
          updateData[sessionKey] = eleve[sessionKey];
        }
      }
      
      // Même chose pour les journées
      for (let i = 1; i <= 20; i++) {
        const journeeKey = `journee_${i}_present` as keyof Eleve;
        if (journeeKey in eleve) {
          updateData[journeeKey] = eleve[journeeKey];
        }
      }
      
      // Si aucun changement, ne pas envoyer de requête
      if (Object.keys(updateData).length === 0) {
        console.log('Aucune donnée à mettre à jour');
        return;
      }
      
      console.log('Données à sauvegarder:', updateData);
      
      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleve.id);
  
      if (error) throw error;
              
      if (onUpdateEleve) {
        onUpdateEleve(eleve);
      }
      
      console.log('Sauvegarde réussie pour élève:', eleve.id);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsProcessing(false); 
    }
  };

  const handleJourneePresenceClick = async (eleve: Eleve, journeeIndex: number) => {
    const currentValue = eleve[`journee_${journeeIndex}_present` as keyof Eleve];
    let nouvelleValeur: boolean | null = null;
    
    // Cycle: null → true → false → null
    if (currentValue === null || currentValue === undefined) {
      nouvelleValeur = true;
    } else if (currentValue === true) {
      nouvelleValeur = false;
    } else {
      nouvelleValeur = null;
    }
    
    const updatedEleve = mettreAJourPresence(eleve, journeeIndex, nouvelleValeur);
    
    // Mise à jour locale immédiate
    const updatedList = localEleves.map(e => 
      e.id === eleve.id ? updatedEleve : e
    );
    setLocalEleves(updatedList);
    
    // Sauvegarde
    await handleSave(updatedEleve, onUpdateEleve);
  };
  
  const handleSessionConvocationClick = async (eleve: Eleve, sessionIndex: number) => {
    // Récupère la valeur actuelle
    const currentValue = (eleve as any)[`session_${sessionIndex}_convoque`] as string | undefined;
    
    // Trouve l'option actuelle dans CONVOCATION_OPTIONS
    const currentIndex = CONVOCATION_OPTIONS.findIndex(opt => opt.value === currentValue);
    
    // Passe à l'option suivante, ou à la première si non défini
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % CONVOCATION_OPTIONS.length;
    const nextValue = CONVOCATION_OPTIONS[nextIndex].value;
    
    const updatedEleve = mettreAJourConvocation(eleve, sessionIndex, nextValue);
    
    // Mise à jour locale
    const updatedList = localEleves.map(e => 
      e.id === eleve.id ? updatedEleve : e
    );
    setLocalEleves(updatedList);
    
    // Sauvegarde
    await handleSave(updatedEleve, onUpdateEleve);
  };
  
  const handleLocalUpdate = async (eleveId: string, field: string, value: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      await onUpdate(eleveId, field, value);
      
      // Mise à jour locale IMMÉDIATE
      setLocalEleves(prev => prev.map(e => {
        if (e.id !== eleveId) return e;
        
        const updatedEleve = { ...e } as any;
        updatedEleve[field] = value === '' ? null : value;
        return updatedEleve as Eleve;
      }));
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };
  

  const handleLocalSelectUpdate = async (eleveId: string, field: string, value: string) => {
    if (isProcessing) return;
      
    try {
      setIsProcessing(true);
        
      await onSelectUpdate(eleveId, field, value);
        
      // Mise à jour locale IMMÉDIATE
      setLocalEleves(prev => prev.map(e => {
        if (e.id !== eleveId) return e;
        
        const updatedEleve = { ...e } as any;
        updatedEleve[field] = value === '' ? null : value;
        return updatedEleve as Eleve;
      }));
        
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalPresenceUpdate = async (
    eleveId: string, 
    field: string, 
    currentValue: boolean | null
  ) => {
    if (isProcessing) return;
      
    try {
      setIsProcessing(true);
        
      await onPresenceUpdate(eleveId, field, currentValue, (newValue) => {
        // Mise à jour locale IMMÉDIATE avec la nouvelle valeur
        setLocalEleves(prev => prev.map(e => {
          if (e.id !== eleveId) return e;
          
          const updatedEleve = { ...e } as any;
          updatedEleve[field] = newValue;
          return updatedEleve as Eleve;
        }));
      });
        
    } catch (err) {
      console.error('Erreur lors de la mise à jour présence:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrer les élèves selon le filtre "convoqués"
  const filteredEleves = showConvoques 
    ? localEleves.filter(e => 
        // Vérifie si convoqué à n'importe quelle session
        Array.from({length: 20}, (_, i) => i + 1).some(i => 
          (e as any)[`session_${i}_convoque`]?.startsWith('Oui')
        )
      )
    : localEleves;

  // Fonction pour obtenir les styles de présence basés sur les nouvelles colonnes
  const getJourneePresenceStyles = (present: boolean | null | undefined) => {
    if (present === true) {
      return {
        bgColor: 'bg-green-100',
        hoverColor: 'hover:bg-green-200',
        textColor: 'text-green-700',
        icon: '✓',
        title: 'Présent'
      };
    } else if (present === false) {
      return {
        bgColor: 'bg-red-100',
        hoverColor: 'hover:bg-red-200',
        textColor: 'text-red-700',
        icon: '✗',
        title: 'Absent'
      };
    } else {
      return {
        bgColor: 'bg-gray-100',
        hoverColor: 'hover:bg-gray-200',
        textColor: 'text-gray-600',
        icon: '?',
        title: 'Non défini'
      };
    }
  };
  
  // Fonction pour obtenir les styles de convocation
  const getSessionConvocationStyles = (valeur: string | undefined) => {
    // Utilise les mêmes fonctions que l'ancien système
    return {
      bgColor: getConvocationColor(valeur || ''),
      textColor: 'text-gray-800',
      label: getConvocationLabel(valeur || '').split(',')[0]
    };
  };

  return (
    <>
      {/* Indicateur de chargement léger */}
      {isProcessing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          Mise à jour en cours...
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConvoques}
                onChange={(e) => setShowConvoques(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">
                Afficher uniquement les élèves convoqués
              </span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingMode}
                onChange={(e) => onSetEditingMode(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
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
                
                {/* Colonnes dynamiques pour les sessions */}
                {loadingSessions ? (
                  <th colSpan={sessions.length * 3} className="px-3 py-3 text-center">
                    <div className="animate-pulse">Chargement des sessions...</div>
                  </th>
                ) : (
                  sessions.map((session, sessionIndex) => (
                
                    <React.Fragment key={session.id}>
                      {/* Colonne Convocation pour la session */}
                      <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap border-l">
                        {session.nom}<br />
                        <span className="text-xs font-normal">Convocation</span>
                      </th>
                      
                      {/* Colonnes Présence pour chaque journée de la session */}
                      {session.journees.map((journeeKey, journeeIndex) => {
                        const journee = journees.find(j => j.key === journeeKey);
                        return (
                          <th key={`${session.id}-${journeeKey}`} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                            {journee ? journee.nom : journeeKey}<br />
                            <span className="text-xs font-normal">Présence</span>
                          </th>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
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
                          onChange={(e) => handleLocalSelectUpdate(eleve.id, 'guide_id', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          disabled={isProcessing}
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
                      {editingMode ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={eleve.categorie || ''}
                            onChange={(e) => handleLocalSelectUpdate(eleve.id, 'categorie', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                            disabled={isProcessing}
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
                              disabled={isProcessing}
                            />
                            <button
                              onClick={handleAddCategory}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 disabled:opacity-50"
                              disabled={isProcessing}
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
                          onBlur={(e) => handleLocalUpdate(eleve.id, 'problematique', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          rows={3}
                          autoFocus
                          disabled={isProcessing}
                        />
                      ) : editingMode ? (
                        <div
                          onClick={() => !isProcessing && onSetEditingCell({id: eleve.id, field: 'problematique'})}
                          className={`cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start ${
                            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {eleve.problematique || '-'}
                        </div>
                      ) : (
                        <div className="min-h-[60px] flex items-start">
                          {eleve.problematique || '-'}
                        </div>
                      )}
                    </td>
                    
                    {/* Colonnes dynamiques pour les sessions */}
                    {loadingSessions ? (
                      <td colSpan={sessions.length * 3} className="px-3 py-3 text-center">
                        <div className="animate-pulse">Chargement...</div>
                      </td>
                    ) : (
                      sessions.map((session, sessionIndex) => {
                        const sessionNum = sessionIndex + 1;
                        const convocationValeur = (eleve as any)[`session_${sessionNum}_convoque`] as string | undefined;
                        const isConvoque = convocationValeur?.startsWith('Oui') === true;
                        const convocationStyles = getSessionConvocationStyles(convocationValeur);
                        
                        return (
                          <React.Fragment key={session.id}>
                            {/* Cellule Convocation pour la session */}
                            <td className="px-3 py-3 border-l">
                              {editingMode ? (
                                <select
                                  value={convocationValeur || ''}
                                  onChange={(e) => {
                                    const updatedEleve = { ...eleve } as any;
                                    updatedEleve[`session_${sessionNum}_convoque`] = e.target.value;
                                    
                                    const updatedList = localEleves.map(e => 
                                      e.id === eleve.id ? updatedEleve : e
                                    );
                                    setLocalEleves(updatedList);
                                    
                                    handleSave(updatedEleve, onUpdateEleve);
                                  }}
                                  className={`w-full border rounded px-2 py-1 text-xs md:text-sm ${getConvocationColor(convocationValeur || '')}`}
                                  disabled={isProcessing}
                                >
                                  {CONVOCATION_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} className={opt.color}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className={`px-2 py-1 rounded ${getConvocationColor(convocationValeur || '')}`}>
                                  {getConvocationLabel(convocationValeur || '').split(',')[0]}
                                </div>
                              )}
                            </td>
                            
                            {/* Cellules Présence pour chaque journée de la session */}
                            {session.journees.map((journeeKey) => {
                              const journeeNum = parseInt(journeeKey.split('_')[1]);
                              const present = eleve[`journee_${journeeNum}_present` as keyof Eleve] as boolean | null | undefined;
                              const presenceStyles = getJourneePresenceStyles(present);
                              
                              return (
                                <td key={`${eleve.id}-${journeeKey}`} className="px-3 py-3 text-center">
                                  {editingMode && isConvoque ? (
                                    <button
                                      onClick={() => !isProcessing && handleJourneePresenceClick(eleve, journeeNum)}
                                      className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presenceStyles.bgColor} ${presenceStyles.hoverColor} ${presenceStyles.textColor} font-bold text-lg ${
                                        isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title={`${presenceStyles.title} (cliquer pour changer)`}
                                      disabled={isProcessing}
                                    >
                                      {presenceStyles.icon}
                                    </button>
                                  ) : (
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presenceStyles.bgColor} ${presenceStyles.textColor} font-bold text-lg ${
                                      !isConvoque ? 'opacity-40' : ''
                                    }`}>
                                      {presenceStyles.icon}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
