// app/dashboard/coordinateur/tabs/ControleTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '../utils/sessionUtils';
import { 
  Users, BookOpen, FileText, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, Filter, Download, RefreshCw,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { Guide, Eleve } from '../types';

interface GuideStats {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  elevesGuides: number;
  elevesLecteurInterne: number;
  sessionsStats: Array<{
    id: number;
    nom: string;
    convocationsRendues: number;
    pourcentage: number;
  }>;
  elevesDetails?: Eleve[];
}

interface SortConfig {
  key: keyof GuideStats;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  minElevesGuides: number;
  minConvocations: number;
}

export default function ControleTab() {
  const [guideStats, setGuideStats] = useState<GuideStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'nom', 
    direction: 'asc' 
  });
  const [filters, setFilters] = useState<FilterConfig>({
    minElevesGuides: 0,
    minConvocations: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<GuideStats | null>(null);
  const [guideDetailsOpen, setGuideDetailsOpen] = useState(false);

  const loadGuideStats = async () => {
    setLoading(true);
    try {
      // Charger tous les guides
      const { data: guides, error: guidesError } = await supabase
        .from('guides')
        .select('*')
        .order('nom', { ascending: true });
      
      if (guidesError) throw guidesError;
  
      // Charger tous les élèves avec leurs guides
      const { data: eleves, error: elevesError } = await supabase
        .from('eleves')
        .select('*');
      
      if (elevesError) throw elevesError;
  
      // Charger et détecter les sessions dynamiques
      const journeesData = await getJourneesFromSupabase(supabase);
      const sessions = detecterSessions(journeesData);
  
      // Calculer les stats pour chaque guide
      const stats = guides.map(guide => {
        const elevesDuGuide = eleves.filter(e => e.guide_id === guide.id);
        const elevesLecteurInterne = eleves.filter(e => e.lecteur_interne_id === guide.id);
        
        // Calculer les stats par session
        const sessionsStats = sessions.map(session => {
          const match = session.id.match(/session_(\d+)/);
          const sessionId = match ? parseInt(match[1]) : 0;
          
          const convocationsRendues = elevesDuGuide.filter(eleve => {
            const columnName = `session_${sessionId}_convoque`;
            const valeur = (eleve as any)[columnName];
            return valeur && valeur.trim() !== '';
          }).length;
  
          return {
            id: sessionId,
            nom: session.nom,
            convocationsRendues,
            pourcentage: elevesDuGuide.length > 0 ? 
              (convocationsRendues / elevesDuGuide.length) * 100 : 0
          };
        });
  
        return {
          id: guide.id,
          nom: guide.nom,
          prenom: guide.prenom,
          initiale: guide.initiale,
          elevesGuides: elevesDuGuide.length,
          elevesLecteurInterne: elevesLecteurInterne.length,
          sessionsStats
        };
      });
  
      setGuideStats(stats);
    } catch (err) {
      console.error('Erreur chargement stats guides:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGuideDetails = async (guideId: string) => {
    try {
      const { data: eleves, error } = await supabase
        .from('eleves')
        .select('*')
        .eq('guide_id', guideId)
        .order('nom', { ascending: true });
      
      if (error) throw error;

      const guide = guideStats.find(g => g.id === guideId);
      if (guide) {
        setSelectedGuide({
          ...guide,
          elevesDetails: eleves || []
        });
        setGuideDetailsOpen(true);
      }
    } catch (err) {
      console.error('Erreur chargement détails guide:', err);
    }
  };

  useEffect(() => {
    loadGuideStats();
  }, []);

  const handleSort = (key: keyof GuideStats) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof GuideStats) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const filteredStats = guideStats.filter(guide => {
    const pourcentageMinSession = Math.min(...guide.sessionsStats.map(s => s.pourcentage));
    return (
      guide.elevesGuides >= filters.minElevesGuides &&
      pourcentageMinSession >= filters.minConvocations
    );
  });

  const sortedStats = [...filteredStats].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="w-4 h-4" />;
    if (percentage >= 50) return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const calculateGlobalMetrics = () => {
    if (guideStats.length === 0) return null;
  
    const totalGuides = guideStats.length;
    const totalElevesGuides = guideStats.reduce((sum, g) => sum + g.elevesGuides, 0);
    const avgElevesPerGuide = totalElevesGuides / totalGuides;
    
    // Calculer les moyennes par session
    let sessionsAverages: Record<number, number> = {};
    
    guideStats.forEach(guide => {
      guide.sessionsStats.forEach(session => {
        if (!sessionsAverages[session.id]) {
          sessionsAverages[session.id] = 0;
        }
        sessionsAverages[session.id] += session.pourcentage;
      });
    });
    
    // Normaliser les moyennes
    Object.keys(sessionsAverages).forEach(key => {
      sessionsAverages[parseInt(key)] /= totalGuides;
    });
  
    const guidesWithHighLoad = guideStats.filter(g => g.elevesGuides > 5).length;
    
    // Guides avec moins de 50% de convocations dans au moins une session
    const guidesWithLowConvocations = guideStats.filter(guide => 
      guide.sessionsStats.some(session => session.pourcentage < 50)
    ).length;
  
    return {
      totalGuides,
      totalElevesGuides,
      avgElevesPerGuide: avgElevesPerGuide.toFixed(1),
      sessionsAverages,
      guidesWithHighLoad,
      guidesWithLowConvocations,
      loadDistribution: (guidesWithHighLoad / totalGuides * 100).toFixed(1)
    };
  };

  const globalMetrics = calculateGlobalMetrics();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">👥 Contrôle des guides</h2>
              <p className="text-gray-600">Suivi détaillé de l'activité</p>
            </div>
          </div>
          <button
            onClick={loadGuideStats}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Métriques globales */}
        {globalMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-700">{globalMetrics.totalGuides}</div>
              <div className="text-sm text-blue-600">Guides actifs</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-700">{globalMetrics.totalElevesGuides}</div>
              <div className="text-sm text-green-600">Élèves assignés</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-700">{globalMetrics.avgElevesPerGuide}</div>
              <div className="text-sm text-purple-600">Moyenne par guide</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">  
            {globalMetrics?.sessionsAverages && Object.entries(globalMetrics.sessionsAverages).slice(0, 4).map(([sessionId, moyenne]) => (
              <div key={sessionId} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-700">{moyenne.toFixed(1)}%</div>
                <div className="text-sm text-yellow-600">Session {sessionId}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
              <Filter className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">Filtres et tri</h3>
              <p className="text-sm text-gray-500">Affinez l'affichage selon vos critères</p>
            </div>
          </div>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {showFilters && (
          <div className="px-6 pb-6 pt-2 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Changé de 3 à 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre minimum d'élèves guidés
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={filters.minElevesGuides}
                  onChange={(e) => setFilters({...filters, minElevesGuides: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {filters.minElevesGuides}+ élève(s)
                </div>
              </div>
              
              {/* REMPLACER les 2 filtres Mars/Avril par un seul */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  % minimum convocations (toutes sessions)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={filters.minConvocations}
                  onChange={(e) => setFilters({...filters, minConvocations: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {filters.minConvocations}% minimum
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {filteredStats.length} guide{filteredStats.length > 1 ? 's' : ''} correspondant aux critères
                </span>
                <button
                  onClick={() => setFilters({
                    minElevesGuides: 0,
                    minConvocations: 0
                  })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tableau des stats */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Liste des guides ({sortedStats.length})
            </h3>
            <div className="text-sm text-gray-600">
              Cliquez sur un nom pour les détails
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('nom')}
                >
                  <div className="flex items-center gap-1">
                    Nom {getSortIcon('nom')}
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
                    TFH lecteur interne {getSortIcon('elevesLecteurInterne')}
                  </div>
                </th>
                {/* Colonnes dynamiques pour les sessions */}
                {guideStats.length > 0 && guideStats[0].sessionsStats.slice(0, 3).map((session, index) => (
                  <th 
                    key={session.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort(`session${index}` as keyof GuideStats)}
                  >
                    <div className="flex items-center gap-1">
                      % {session.nom.split(' ')[1]} {/* Affiche seulement le mois */}
                      {/* {getSortIcon(`session${index}` as keyof GuideStats)} */}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedStats.map((guide) => (
                <tr 
                  key={guide.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadGuideDetails(guide.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold mr-3">
                        {guide.initiale}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {guide.nom} {guide.prenom}
                        </div>
                        <div className="text-sm text-gray-500">
                          {guide.elevesGuides} élève{guide.elevesGuides > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{guide.elevesGuides}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        guide.elevesGuides > 2 ? 'bg-yellow-100 text-yellow-800' :
                        guide.elevesGuides > 0 ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guide.elevesGuides > 2 ? 'Charge élevée' :
                         guide.elevesGuides > 0 ? 'Charge normale' : 'Charge insuffisante'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{guide.elevesLecteurInterne}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        guide.elevesLecteurInterne > 2 ? 'bg-yellow-100 text-yellow-800' :
                        guide.elevesLecteurInterne > 0 ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guide.elevesLecteurInterne > 2 ? 'Charge élevée' :
                         guide.elevesLecteurInterne > 0 ? 'Charge normale' : 'Charge insuffisante'}
                      </div>
                    </div>
                  </td>
                  {guide.sessionsStats.slice(0, 3).map((session) => (
                    <td key={session.id} className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex items-center gap-1 ${getPerformanceColor(session.pourcentage)} px-2 py-1 rounded`}>
                          {getPerformanceIcon(session.pourcentage)}
                          <span className="font-medium">
                            {session.pourcentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Guide d'interprétation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-600 mb-2">Charge de travail :</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></div>
                <span><strong>0 élèves</strong> : Charge insuffisante</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></div>
                <span><strong>1-2 élèves</strong> : Charge normale</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></div>
                <span><strong>3+ élèves</strong> : Charge élevée</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal détails guide */}
      {selectedGuide && guideDetailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Détails pour {selectedGuide.prenom} {selectedGuide.nom}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedGuide.elevesGuides} élève{selectedGuide.elevesGuides > 1 ? 's' : ''} guidé{selectedGuide.elevesGuides > 1 ? 's' : ''} • {selectedGuide.elevesLecteurInterne} lecteur{selectedGuide.elevesLecteurInterne > 1 ? 's' : ''} interne{selectedGuide.elevesLecteurInterne > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGuideDetailsOpen(false);
                    setSelectedGuide(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Récapitulatif</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Charge totale :</span>
                      <span className="font-medium">{selectedGuide.elevesGuides} TFH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lecteur interne :</span>
                      <span className="font-medium">{selectedGuide.elevesLecteurInterne} TFH</span>
                    </div>
                    
                    {/* Stats par session */}
                    {selectedGuide.sessionsStats.map((session, index) => (
                      <div key={session.id} className="flex justify-between">
                        <span className="text-gray-600">{session.nom} :</span>
                        <span className={`font-medium ${
                          session.pourcentage >= 80 ? 'text-green-600' :
                          session.pourcentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {session.pourcentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedGuide.elevesDetails && selectedGuide.elevesDetails.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h4 className="font-medium text-gray-700">
                      Élèves guidés ({selectedGuide.elevesDetails.length})
                    </h4>
                  </div>
                  <div className="divide-y">
                    {selectedGuide.elevesDetails.map((eleve) => (
                      <div key={eleve.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {eleve.prenom} {eleve.nom}
                            </div>
                            <div className="text-sm text-gray-600">
                              {eleve.classe} • {eleve.categorie || 'Non catégorisé'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Convocations par session</div>
                            <div className="flex items-center gap-2">
                              {/* Afficher les convocations par session */}
                              {selectedGuide.sessionsStats.slice(0, 3).map((session) => {
                                const columnName = `session_${session.id}_convoque`;
                                const statut = (eleve as any)[columnName];
                                const estRendu = statut && statut.trim() !== '';
                                
                                return (
                                  <span 
                                    key={session.id} 
                                    className={`text-xs px-2 py-1 rounded ${
                                      estRendu ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}
                                    title={session.nom}
                                  >
                                    {session.nom.split(' ')[1]}: {estRendu ? '✓' : '✗'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
                        
            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setGuideDetailsOpen(false);
                  setSelectedGuide(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
