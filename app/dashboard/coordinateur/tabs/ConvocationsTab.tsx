'use client';

import { supabase } from '@/lib/supabase';
import React from 'react';
import { useState, useEffect } from 'react';
import { Eleve, Guide } from '../types';
import { CONVOCATION_OPTIONS } from '../constants';
import { 
  getConvocationColor, 
  getConvocationLabelShort
} from '../utils/convocationUtils';
import { 
  getJourneesFromSupabase, 
  detecterSessions,
  type Session
} from '../utils/sessionUtils';

interface ConvocationsTabProps {
  eleves: Eleve[];
  guides: Guide[];
  editingMode: boolean;
  editingCell: {id: string, field: string} | null;
  onUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onSelectUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
  onSetEditingCell: (cell: {id: string, field: string} | null) => void;
  onSetEditingMode: (mode: boolean) => void;
}

export default function ConvocationsTab({
  eleves,
  guides,
  editingMode,
  editingCell,
  onUpdate,
  onSelectUpdate,
  onRefresh,
  onSetEditingCell,
  onSetEditingMode
}: ConvocationsTabProps) {
  const [showConvoques, setShowConvoques] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Synchroniser les données locales avec les données parent
  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  // Charger les sessions
  useEffect(() => {
    const chargerSessions = async () => {
      setLoadingSessions(true);
      try {
        const journeesData = await getJourneesFromSupabase(supabase);
        const sessionsDetectees = detecterSessions(journeesData);
        setSessions(sessionsDetectees);
      } catch (error) {
        console.error('Erreur lors du chargement des sessions:', error);
      } finally {
        setLoadingSessions(false);
      }
    };
  
    chargerSessions();
  }, []);

  // Fonction pour sauvegarder une convocation
  const handleSaveConvocation = async (eleve: Eleve, sessionNum: number, value: string) => {
    setIsProcessing(true);
    try {
      const columnName = `session_${sessionNum}_convoque`;
      const updateData = { [columnName]: value };
      
      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleve.id);
  
      if (error) throw error;
      
      // Mise à jour locale
      setLocalEleves(prev => prev.map(e => 
        e.id === eleve.id ? { ...e, [columnName]: value } as Eleve : e
      ));
      
      console.log('Convocation sauvegardée:', eleve.id, columnName, value);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
      onRefresh();
    } finally {
      setIsProcessing(false); 
    }
  };

  // Fonction pour vérifier si un élève est convoqué à une session
  const estConvoquePourSession = (eleve: Eleve, session: Session): boolean => {
    const sessionNum = parseInt(session.id.split('_')[1]);
    const columnName = `session_${sessionNum}_convoque` as keyof Eleve;
    const valeur = (eleve as any)[columnName];
    return valeur?.startsWith('Oui') === true;
  };

  // Filtrer les élèves selon les filtres
  const filteredEleves = localEleves.filter(eleve => {
    // Filtre "convoqués uniquement"
    if (showConvoques) {
      // Si une session spécifique est sélectionnée
      if (selectedSession !== 'all') {
        const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
        return session ? estConvoquePourSession(eleve, session) : false;
      }
      // Si "toutes les sessions", vérifier si convoqué à au moins une session
      return sessions.some(session => estConvoquePourSession(eleve, session));
    }
    return true;
  });

  // Fonction pour obtenir le nom d'affichage d'une session
  const getSessionDisplayName = (session: Session) => {
    return session.nom.replace('Session ', '');
  };

  // Obtenir les sessions à afficher selon le filtre
  const getSessionsToDisplay = () => {
    if (selectedSession === 'all') {
      return sessions;
    }
    const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
    return session ? [session] : [];
  };

  return (
    <>
      {/* Indicateur de chargement */}
      {isProcessing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          Mise à jour en cours...
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Mode édition */}
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

            {/* Filtre convoqués uniquement */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConvoques}
                onChange={(e) => setShowConvoques(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">
                Afficher uniquement les convoqués
              </span>
            </label>
          </div>

          {/* Sélecteur de session */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Session :</span>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              disabled={loadingSessions || isProcessing}
            >
              <option value="all">Toutes les sessions</option>
              {sessions.map(session => {
                const sessionNum = parseInt(session.id.split('_')[1]);
                return (
                  <option key={session.id} value={sessionNum.toString()}>
                    {getSessionDisplayName(session)}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-sm text-gray-500">
            ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''})
          </span>
        </div>
        
        {/* Légende simplifiée */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Légende des convocations :</p>
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
      </div>

      {/* Tableau des convocations */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[800px] md:min-w-full">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Classe
                </th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Élève
                </th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Guide
                </th>
                
                {/* Colonnes des sessions */}
                {loadingSessions ? (
                  <th colSpan={getSessionsToDisplay().length} className="px-3 py-3 text-center">
                    <div className="animate-pulse">Chargement des sessions...</div>
                  </th>
                ) : (
                  getSessionsToDisplay().map((session) => (
                    <th 
                      key={session.id} 
                      className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap border-l"
                    >
                      <div className="flex flex-col">
                        <span>{getSessionDisplayName(session)}</span>
                        <span className="text-xs font-normal text-gray-500">
                          Convocation
                        </span>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEleves.map((eleve) => {
                const sessionNumForSession = (session: Session) => {
                  return parseInt(session.id.split('_')[1]);
                };
                
                return (
                  <tr key={eleve.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {eleve.classe}
                    </td>
                    
                    <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">
                      {eleve.nom} {eleve.prenom}
                    </td>
                    
                    {/* Guide */}
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {editingMode ? (
                        <select
                          value={eleve.guide_id || ''}
                          onChange={(e) => {
                            setIsProcessing(true);
                            onSelectUpdate(eleve.id, 'guide_id', e.target.value)
                              .finally(() => setIsProcessing(false));
                          }}
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
                    
                    {/* Cellules de convocation pour chaque session */}
                    {loadingSessions ? (
                      <td colSpan={getSessionsToDisplay().length} className="px-3 py-3 text-center">
                        <div className="animate-pulse">Chargement...</div>
                      </td>
                    ) : (
                      getSessionsToDisplay().map((session) => {
                        const sessionNum = sessionNumForSession(session);
                        const columnName = `session_${sessionNum}_convoque`;
                        const convocationValeur = (eleve as any)[columnName] as string | undefined;
                        
                        return (
                          <td key={`${eleve.id}-${session.id}`} className="px-3 py-3 border-l">
                            {editingMode ? (
                              <select
                                value={convocationValeur || ''}
                                onChange={(e) => {
                                  handleSaveConvocation(eleve, sessionNum, e.target.value);
                                }}
                                className={`w-full border rounded px-2 py-1 text-xs md:text-sm text-center ${getConvocationColor(convocationValeur || '')}`}
                                disabled={isProcessing}
                              >
                                {CONVOCATION_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} className={opt.color}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={`px-2 py-1 rounded text-center font-medium ${getConvocationColor(convocationValeur || '')}`}>
                                {getConvocationLabelShort(convocationValeur || '')}
                              </div>
                            )}
                          </td>
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
