// app/dashboard/direction/tabs/InterfaceGuideTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '../../coordinateur/utils/sessionUtils';
import { getConvocationColor, getConvocationLabelShort } from '../../coordinateur/utils/convocationUtils';
import { Eleve } from '../types';

interface InterfaceGuideTabProps {
  guideId: string;
  onRefresh?: () => void;
}

interface Session {
  index: number;
  nom: string;
}

export default function InterfaceGuideTab({ guideId, onRefresh }: InterfaceGuideTabProps) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [objectifGeneral, setObjectifGeneral] = useState<string>('');
  const [showObjectifModal, setShowObjectifModal] = useState(false);
  const [selectedEleveForObjectif, setSelectedEleveForObjectif] = useState<Eleve | null>(null);
  const [objectifParticulier, setObjectifParticulier] = useState('');
  const [savingObjectif, setSavingObjectif] = useState(false);

  const CONVOCATION_OPTIONS = [
    { value: '', label: '-', color: 'bg-gray-100' },
    { 
      value: 'Non, l\'élève atteint bien les objectifs', 
      label: 'Non, l\'élève atteint bien les objectifs',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    { 
      value: 'Oui, l\'élève n\'atteint pas les objectifs', 
      label: 'Oui, l\'élève n\'atteint pas les objectifs',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    { 
      value: 'Oui, l\'élève n\'a pas avancé', 
      label: 'Oui, l\'élève n\'a pas avancé',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    { 
      value: 'Oui, l\'élève n\'a pas communiqué', 
      label: 'Oui, l\'élève n\'a pas communiqué',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    }
  ];

  useEffect(() => {
    loadData(guideId);
    loadSessions();
    loadObjectifGeneral();
  }, [guideId]);

  const loadSessions = async () => {
    try {
      const journeesData = await getJourneesFromSupabase(supabase);
      const sessionsDetectees = detecterSessions(journeesData);
      
      const toutesSessions = sessionsDetectees.map(session => {
        const match = session.id.match(/session_(\d+)/);
        const index = match ? parseInt(match[1]) : 0;
        return {
          index: index,
          nom: session.nom
        };
      });
      
      setSessions(toutesSessions);
    } catch (error) {
      console.error('Erreur chargement des sessions:', error);
    }
  };

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Charger les élèves assignés à ce guide
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, prenom),
          lecteur_interne:guides!lecteur_interne_id (nom, prenom)
        `)
        .eq('guide_id', userId)
        .order('classe', { ascending: true })
        .order('nom', { ascending: true });

      if (elevesError) throw elevesError;

      const elevesFormatted = (elevesData || []).map(eleve => ({
        ...eleve,
        guide_nom: eleve.guide?.nom || '-',
        guide_prenom: eleve.guide?.prenom || '-',
        lecteur_interne_nom: eleve.lecteur_interne?.nom || '-',
        lecteur_interne_prenom: eleve.lecteur_interne?.prenom || '-'
      }));

      setEleves(elevesFormatted);

    } catch (err) {
      console.error('Erreur chargement des données:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadObjectifGeneral = async () => {
    try {
      const { data: objectifData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .single();
      
      if (objectifData) {
        setObjectifGeneral(objectifData.setting_value || '');
      }
    } catch (err) {
      console.error('Erreur chargement objectif général:', err);
    }
  };

  const handleUpdateProblematique = async (eleveId: string, value: string) => {
    try {
      const { error } = await supabase
        .from('eleves')
        .update({ problematique: value })
        .eq('id', eleveId);
  
      if (error) throw error;
  
      setEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, problematique: value } : eleve
      ));
      
    } catch (err) {
      console.error('Erreur mise à jour problématique:', err);
      loadData(guideId);
    }
  };

  const handleUpdateSessionConvocation = async (eleveId: string, sessionIndex: number, value: string) => {
    try {
      const columnName = `session_${sessionIndex}_convoque`;
      const updateData: any = {};
      updateData[columnName] = value;
  
      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);
  
      if (error) throw error;
  
      setEleves(prev => prev.map(eleve => {
        if (eleve.id === eleveId) {
          return { 
            ...eleve, 
            [columnName]: value
          };
        }
        return eleve;
      }));
      
    } catch (err) {
      console.error('Erreur mise à jour convocation:', err);
      loadData(guideId);
    }
  };

  const openObjectifModal = (eleve: Eleve) => {
    setSelectedEleveForObjectif(eleve);
    setObjectifParticulier(eleve.objectif_particulier || '');
    setShowObjectifModal(true);
  };

  const saveObjectifParticulier = async () => {
    if (!selectedEleveForObjectif) return;
  
    setSavingObjectif(true);
    try {
      const { error } = await supabase
        .from('eleves')
        .update({ 
          objectif_particulier: objectifParticulier.trim() || null 
        })
        .eq('id', selectedEleveForObjectif.id);
  
      if (error) throw error;
  
      // Mettre à jour l'état local
      const updatedEleves = eleves.map(eleve => 
        eleve.id === selectedEleveForObjectif.id 
          ? { ...eleve, objectif_particulier: objectifParticulier.trim() || null }
          : eleve
      );
      setEleves(updatedEleves);
  
      setShowObjectifModal(false);
      setSelectedEleveForObjectif(null);
      
      alert('Objectif sauvegardé avec succès !');
      
    } catch (err) {
      console.error('Erreur sauvegarde objectif:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSavingObjectif(false);
    }
  };

  const closeObjectifModal = () => {
    setShowObjectifModal(false);
    setSelectedEleveForObjectif(null);
    setObjectifParticulier('');
  };

  const getShortLabel = (value: string) => {
    return getConvocationLabelShort(value);
  };

  const handleRefresh = () => {
    loadData(guideId);
    if (onRefresh) onRefresh();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos élèves...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">Mon interface Guide</h2>
            <p className="text-gray-600 mt-1">
              Interface spécifique pour votre rôle de guide ({eleves.length} élève{eleves.length > 1 ? 's' : ''})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Objectif général et légende */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Objectif général */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-blue-200 h-full">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2 mb-2">
              <span className="text-xl">🎯</span>
              Objectifs et échéances
            </h2>
            {objectifGeneral ? (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Tenez compte de ces objectifs pour décider des convocations à la prochaine session TFH.
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-bold">!</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">
                        {objectifGeneral}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Aucun objectif général n'a été défini pour le moment.
                </p>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Les objectifs généraux seront définis par les coordinateurs.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Légende des convocations */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-gray-200 h-full">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
            <span className="text-xl">📋</span>
            Légende des convocations
          </h2>
          <div className="space-y-2">
            {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
              <div 
                key={opt.value} 
                className={`${opt.color} px-3 py-2 rounded-lg flex items-center gap-3`}
              >
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: opt.color.includes('green') ? '#10B981' :
                                   opt.color.includes('yellow') ? '#F59E0B' :
                                   opt.color.includes('orange') ? '#F97316' :
                                   opt.color.includes('red') ? '#EF4444' : '#6B7280'
                  }}></div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {getShortLabel(opt.label)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau des élèves assignés */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Problématique</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Objectif particulier</th>
              {/* En-têtes dynamiques des sessions */}
              {sessions.map(session => (
                <th key={session.index} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {session.nom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eleves.map((eleve) => (
              <tr key={eleve.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{eleve.classe}</td>
                <td className="px-4 py-3 text-sm font-medium">{eleve.nom}</td>
                <td className="px-4 py-3 text-sm">{eleve.prenom}</td>
                <td className="px-4 py-3 text-sm">
                  {editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                    <textarea
                      defaultValue={eleve.problematique}
                      onBlur={(e) => handleUpdateProblematique(eleve.id, e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setEditingCell({id: eleve.id, field: 'problematique'})}
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start whitespace-pre-wrap break-words"
                    >
                      {eleve.problematique || '-'}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 text-sm">
                  <div className="space-y-1">
                    <button
                      onClick={() => openObjectifModal(eleve)}
                      className={`flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        eleve.objectif_particulier
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={eleve.objectif_particulier || "Cliquer pour définir un objectif"}
                    >
                      <span className={`text-lg ${eleve.objectif_particulier ? 'text-green-600' : 'text-gray-400'}`}>
                        🎯
                      </span>
                      <span className="text-xs">
                        {eleve.objectif_particulier 
                          ? (eleve.objectif_particulier.length > 20 
                              ? eleve.objectif_particulier.substring(0, 20) + '...' 
                              : eleve.objectif_particulier)
                          : 'Définir'}
                      </span>
                    </button>
                    
                    {eleve.objectif_particulier && (
                      <div className="text-xs text-gray-500 text-center">
                        {eleve.objectif_particulier.length > 100 
                          ? `${Math.ceil(eleve.objectif_particulier.length / 100)} paragraphe(s)` 
                          : 'Objectif défini'}
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Toutes les sessions détectées */}
                {sessions.map(session => {
                  const columnName = `session_${session.index}_convoque`;
                  const valeur = (eleve as any)[columnName] as string | undefined;
                  const statut = valeur || '';
                  
                  return (
                    <td key={session.index} className="px-4 py-3">
                      <div className="space-y-1">
                        <select
                          value={statut}
                          onChange={(e) => handleUpdateSessionConvocation(eleve.id, session.index, e.target.value)}
                          className={`w-full border rounded px-2 py-1 text-sm ${getConvocationColor(statut)}`}
                          title={statut || 'Non défini'}
                        >
                          {CONVOCATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className={opt.color}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <div className={`text-xs px-2 py-1 rounded truncate ${getConvocationColor(statut)}`}>
                          {getConvocationLabelShort(statut)}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note informative */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-700 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <span>
            • Vous pouvez modifier la problématique en cliquant dessus<br/>
            • Utilisez les menus déroulants pour définir les convocations par session<br/>
            • Définissez des objectifs particuliers pour chaque élève en cliquant sur le bouton 🎯<br/>
            • Cette interface est spécifique à votre rôle de guide
          </span>
        </p>
      </div>

      {/* Modal d'objectif particulier */}
      {showObjectifModal && selectedEleveForObjectif && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* En-tête */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    🎯 Objectif particulier
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEleveForObjectif.prenom} {selectedEleveForObjectif.nom} - {selectedEleveForObjectif.classe}
                  </p>
                </div>
                <button
                  onClick={closeObjectifModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
      
            {/* Contenu */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objectif spécifique pour cet élève :
                </label>
                <textarea
                  value={objectifParticulier}
                  onChange={(e) => setObjectifParticulier(e.target.value)}
                  className="w-full h-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Définir un objectif pédagogique spécifique pour cet élève..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Cet objectif n'est visible que par vous (guide) et l'administration.
                </p>
              </div>
      
              {selectedEleveForObjectif.problematique && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Problématique de l'élève :</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedEleveForObjectif.problematique}
                  </p>
                </div>
              )}
            </div>
      
            {/* Pied de page */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeObjectifModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  disabled={savingObjectif}
                >
                  Annuler
                </button>
                <button
                  onClick={saveObjectifParticulier}
                  disabled={savingObjectif}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    !savingObjectif
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-400 text-white cursor-not-allowed'
                  }`}
                >
                  {savingObjectif ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    'Sauvegarder l\'objectif'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
