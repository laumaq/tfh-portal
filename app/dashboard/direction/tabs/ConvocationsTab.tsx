// app/dashboard/direction/tabs/ConvocationsTab.tsx

'use client';

import { supabase } from '@/lib/supabase';
import React from 'react';
import { useState, useEffect } from 'react';
import { Eleve, Guide } from '../../coordinateur/types';
import { CONVOCATION_OPTIONS } from '../../coordinateur/constants';
import { 
  getConvocationColor, 
  getConvocationLabelShort 
} from '../../coordinateur/utils/convocationUtils';
import { 
  getJourneesFromSupabase, 
  detecterSessions,
  type Session 
} from '../../coordinateur/utils/sessionUtils';

interface ConvocationsTabDirectionProps {
  eleves: Eleve[];
  guides: Guide[];
  onRefresh: () => void;
  canEdit?: (eleve: Eleve) => boolean; // Optionnel : fonction pour vérifier les droits
}

export default function ConvocationsTabDirection({
  eleves,
  guides,
  onRefresh,
  canEdit
}: ConvocationsTabDirectionProps) {
  const [showConvoques, setShowConvoques] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Récupérer l'ID de l'utilisateur connecté
  useEffect(() => {
    const id = localStorage.getItem('userId');
    setUserId(id);
  }, []);

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

  // Fonction pour vérifier si la direction peut voir/éditer cet élève
  const canAccessEleve = (eleve: Eleve): boolean => {
    return true;
  };

  // Fonction pour vérifier si un élève est convoqué à une session
  const estConvoquePourSession = (eleve: Eleve, session: Session): boolean => {
    const sessionNum = parseInt(session.id.split('_')[1]);
    const columnName = `session_${sessionNum}_convoque` as keyof Eleve;
    const valeur = (eleve as any)[columnName];
    return valeur?.startsWith('Oui') === true;
  };

  // Filtrer les élèves selon les droits d'accès et les filtres
  const filteredEleves = localEleves.filter(eleve => {
    // Vérifier les droits d'accès
    if (!canAccessEleve(eleve)) return false;

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Convocations</h1>
        <p className="text-gray-600">
          Vue des convocations pour les TFH
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Note sur les droits d'accès */}
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                📋 Visualisation seule - Droits d'édition restreints
              </span>
            </div>

            {/* Filtre convoqués uniquement */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConvoques}
                onChange={(e) => setShowConvoques(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
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
              disabled={loadingSessions}
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
            ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''} accessible{filteredEleves.length > 1 ? 's' : ''})
          </span>
        </div>

        {/* Statistiques de vue */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{filteredEleves.length}</div>
              <div className="text-sm text-gray-600">TFH accessibles</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {filteredEleves.filter(e => sessions.some(s => estConvoquePourSession(e, s))).length}
              </div>
              <div className="text-sm text-gray-600">Élèves convoqués</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {sessions.length}
              </div>
              <div className="text-sm text-gray-600">Sessions détectées</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {filteredEleves.filter(e => e.guide_id === userId).length}
              </div>
              <div className="text-sm text-gray-600">Élèves encadrés</div>
            </div>
          </div>
        </div>

        {/* Légende */}
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
      {filteredEleves.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun TFH trouvé</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Aucun TFH n'a été trouvé dans le système.
          </p>
        </div>
      ) : (
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
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Rôle
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

                  // Déterminer le rôle de la direction pour cet élève
                  const getRoleForEleve = (eleve: Eleve) => {
                    if (eleve.guide_id === userId && eleve.lecteur_interne_id === userId) {
                      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Guide & Lecteur</span>;
                    } else if (eleve.guide_id === userId) {
                      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Guide</span>;
                    } else if (eleve.lecteur_interne_id === userId) {
                      return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Lecteur interne</span>;
                    }
                    return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">-</span>;
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
                        <span>
                          {eleve.guide_nom} {eleve.guide_prenom}.
                        </span>
                      </td>

                      {/* Rôle de la direction */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {getRoleForEleve(eleve)}
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
                              <div className={`px-2 py-1 rounded text-center font-medium ${getConvocationColor(convocationValeur || '')}`}>
                                {getConvocationLabelShort(convocationValeur || '')}
                              </div>
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
      )}

      {/* Note sur les droits */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Informations sur les droits d'accès :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Vous avez accès à la liste complète des convocations</li>
              <li>Les convocations sont en lecture seule pour la direction</li>
              <li>Pour modifier les convocations, contactez un coordinateur</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
