// app/dashboard/coordinateur/tabs/PresencesTabDirection.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eleve } from '../../coordinateur/types';
import { getPresenceStyles } from '../../coordinateur/utils/convocationUtils';
import { detecterSessions, getJourneesFromSupabase, type Session } from '../../coordinateur/utils/sessionUtils';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface PresencesTabDirectionProps {
  eleves: Eleve[];
  onRefresh: () => void;
  canEdit?: (eleve: Eleve) => boolean; // Optionnel : fonction pour vérifier les droits
}

export default function PresencesTabDirection({
  eleves,
  onRefresh,
  canEdit
}: PresencesTabDirectionProps) {
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [showConvoquesOnly, setShowConvoquesOnly] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [journees, setJournees] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [userId, setUserId] = useState<string | null>(null);

  // Récupérer l'ID de l'utilisateur connecté
  useEffect(() => {
    const id = localStorage.getItem('userId');
    setUserId(id);
  }, []);

  // Synchroniser localEleves avec eleves parent
  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  // Charger les sessions
  useEffect(() => {
    const chargerSessions = async () => {
      setLoadingSessions(true);
      try {
        const journeesData = await getJourneesFromSupabase(supabase);
        setJournees(journeesData);
        
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

  // Fonction pour vérifier si la direction peut voir cet élève
  const canAccessEleve = (eleve: Eleve): boolean => {
    true;
  };

  // Fonction pour vérifier si un élève est convoqué à une session
  const estConvoquePourSession = (eleve: Eleve, session: Session): boolean => {
    const sessionNum = parseInt(session.id.split('_')[1]);
    const columnName = `session_${sessionNum}_convoque` as keyof Eleve;
    const valeur = (eleve as any)[columnName];
    
    // Convoqué si la valeur commence par "Oui"
    return valeur?.startsWith('Oui') === true;
  };

  // Obtenir les élèves accessibles et filtrés
  const getAccessibleEleves = () => {
    return localEleves.filter(eleve => canAccessEleve(eleve));
  };

  // Filtrer les élèves selon les droits d'accès et les filtres
  const filteredEleves = getAccessibleEleves().filter(eleve => {
    // Filtre "convoqués uniquement"
    if (showConvoquesOnly && selectedSession !== 'all') {
      const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
      if (!session) return false;
      return estConvoquePourSession(eleve, session);
    }
    return true;
  });

  // Obtenir les journées à afficher selon la session sélectionnée
  const getJourneesToDisplay = () => {
    if (selectedSession === 'all' || loadingSessions || sessions.length === 0) {
      // Afficher toutes les journées
      return journees;
    }
    
    const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
    if (!session) return journees;
    
    // Retourner seulement les journées de cette session
    return journees.filter(journee => 
      session.journees.includes(journee.key)
    );
  };

  // Obtenir le nom d'affichage pour une session
  const getSessionDisplayName = (session: Session) => {
    return session.nom.replace('Session ', '');
  };

  // Fonction pour obtenir le rôle de la direction pour un élève
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

  // Export functions
  const getElevesToExport = () => {
    return filteredEleves;
  };
  
  const exportToTSV = () => {
    const elevesToExport = getElevesToExport();
    const headers = ['Classe', 'Nom', 'Prénom', 'Rôle', ...getJourneesToDisplay().map(j => j.nom)];
    
    const data = elevesToExport.map(eleve => {
      const role = eleve.guide_id === userId ? 
                  (eleve.lecteur_interne_id === userId ? 'Guide & Lecteur' : 'Guide') : 
                  'Lecteur interne';
      
      const row = [
        eleve.classe,
        eleve.nom,
        eleve.prenom,
        role,
        ...getJourneesToDisplay().map(journee => {
          const journeeNum = parseInt(journee.key.split('_')[1]);
          const field = `journee_${journeeNum}_present`;
          const present = (eleve as any)[field];
          
          if (present === true) return '✓';
          if (present === false) return '✗';
          return '?';
        })
      ];
      return row;
    });
  
    const tsvContent = [
      headers.join('\t'),
      ...data.map(row => row.join('\t'))
    ].join('\n');
  
    const blob = new Blob(['\ufeff' + tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presences_direction_${selectedSession === 'all' ? 'toutes_sessions' : `session_${selectedSession}`}_${new Date().toISOString().split('T')[0]}.tsv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const exportToXLSX = () => {
    const elevesToExport = getElevesToExport();
    const headers = ['Classe', 'Nom', 'Prénom', 'Rôle', ...getJourneesToDisplay().map(j => j.nom)];
    
    const data = elevesToExport.map(eleve => {
      const role = eleve.guide_id === userId ? 
                  (eleve.lecteur_interne_id === userId ? 'Guide & Lecteur' : 'Guide') : 
                  'Lecteur interne';
      
      return [
        eleve.classe,
        eleve.nom,
        eleve.prenom,
        role,
        ...getJourneesToDisplay().map(journee => {
          const journeeNum = parseInt(journee.key.split('_')[1]);
          const field = `journee_${journeeNum}_present`;
          const present = (eleve as any)[field];
          
          if (present === true) return '✓';
          if (present === false) return '✗';
          return '?';
        })
      ];
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Présences');
    
    // Auto-size columns
    const max_width = headers.reduce((w, r) => Math.max(w, r.length), 10);
    worksheet['!cols'] = headers.map(() => ({ wch: max_width }));
  
    XLSX.writeFile(workbook, `presences_direction_${selectedSession === 'all' ? 'toutes_sessions' : `session_${selectedSession}`}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  
  const handleExport = (format: 'tsv' | 'xlsx') => {
    if (format === 'tsv') {
      exportToTSV();
    } else {
      exportToXLSX();
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Présences</h1>
        <p className="text-gray-600">
          Vue des présences pour les TFH sous votre responsabilité
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Note sur les droits d'accès */}
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                👁️ Visualisation seule - Pas de droits d'édition
              </span>
            </div>
        
            {/* Filtre convoqués uniquement */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConvoquesOnly}
                onChange={(e) => setShowConvoquesOnly(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={selectedSession === 'all'}
              />
              <span className="text-sm font-medium">
                Afficher uniquement les convoqués
              </span>
            </label>
        
            {/* Bouton Export */}
            <div className="relative group">
              <button
                onClick={() => handleExport('xlsx')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                disabled={filteredEleves.length === 0}
              >
                📊 Exporter
              </button>
              
              {/* Menu déroulant pour le format */}
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-green-600">📗</span>
                  <div>
                    <div className="font-medium">Excel (.xlsx)</div>
                    <div className="text-xs text-gray-500">Format recommandé</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('tsv')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-t"
                >
                  <span className="text-blue-600">📄</span>
                  <div>
                    <div className="font-medium">TSV (.tsv)</div>
                    <div className="text-xs text-gray-500">Pour Excel/Google Sheets</div>
                  </div>
                </button>
              </div>
            </div>
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
        <div className="mt-4 p-4 bg-gray-50 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{getAccessibleEleves().length}</div>
              <div className="text-sm text-gray-600">TFH accessibles</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {getAccessibleEleves().filter(e => sessions.some(s => estConvoquePourSession(e, s))).length}
              </div>
              <div className="text-sm text-gray-600">Élèves convoqués</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {journees.length}
              </div>
              <div className="text-sm text-gray-600">Journées totales</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {selectedSession !== 'all' ? 
                  getJourneesToDisplay().length : 
                  sessions.length
                }
              </div>
              <div className="text-sm text-gray-600">
                {selectedSession !== 'all' ? 'Journées session' : 'Sessions détectées'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Légende */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Légende de présence :</p>
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
          {showConvoquesOnly && selectedSession !== 'all' && (
            <p className="text-xs text-blue-600 mt-2">
              ※ Affichage filtré : uniquement les élèves convoqués à cette session
            </p>
          )}
        </div>
      </div>

      {/* Tableau des présences */}
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
      ) : loadingSessions ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Chargement des sessions...</p>
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
                    Rôle
                  </th>
                  
                  {/* Colonnes des journées */}
                  {getJourneesToDisplay().map(journee => {
                    const session = sessions.find(s => 
                      s.journees.includes(journee.key)
                    );
                    
                    return (
                      <th 
                        key={journee.key} 
                        className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap border-l"
                      >
                        <div className="flex flex-col">
                          <span>{journee.nom}</span>
                          {session && (
                            <span className="text-xs font-normal text-gray-500">
                              {getSessionDisplayName(session)}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEleves.map(eleve => {
                  const isConvoque = selectedSession === 'all' || 
                    (() => {
                      const session = sessions.find(s => s.id === `session_${parseInt(selectedSession)}`);
                      return session ? estConvoquePourSession(eleve, session) : true;
                    })();
                  
                  return (
                    <tr key={eleve.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.classe}
                      </td>
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap font-medium">
                        {eleve.nom} {eleve.prenom}
                      </td>
                      
                      {/* Rôle de la direction */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {getRoleForEleve(eleve)}
                      </td>
                      
                      {/* Cellules de présence */}
                      {getJourneesToDisplay().map(journee => {
                        const journeeNum = parseInt(journee.key.split('_')[1]);
                        const field = `journee_${journeeNum}_present`;
                        const present = (eleve as any)[field] as boolean | null | undefined;
                        const presenceStyles = getPresenceStyles((eleve as any)[field] ?? null);
                        
                        return (
                          <td key={`${eleve.id}-${journee.key}`} className="px-3 py-3 text-center border-l">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
                              presenceStyles.bgColor
                            } ${presenceStyles.textColor} font-bold text-lg ${
                              !isConvoque ? 'opacity-40' : ''
                            }`}>
                              {presenceStyles.icon}
                            </div>
                          </td>
                        );
                      })}
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
              <li>Vous avez accès à la liste complète des présences</li>
              <li>Les présences sont en lecture seule pour la direction</li>
              <li>Pour modifier les présences, contactez un coordinateur</li>
              <li>Les données peuvent être exportées pour vos archives</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
