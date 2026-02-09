// app/dashboard/direction/tabs/PlanningPersonnelTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eleve } from '../../coordinateur/types';
import { getJourneesFromSupabase, detecterSessions } from '../../coordinateur/utils/sessionUtils';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users,
  FileText
} from 'lucide-react';

interface PlanningPersonnelTabProps {
  guideId: string;
  eleves: Eleve[];
}

interface Defense {
  id: string;
  date: string;
  heure: string;
  eleve_nom: string;
  eleve_prenom: string;
  eleve_classe: string;
  localisation: string | null;
  role: 'guide' | 'lecteur_interne' | 'guide_et_lecteur_interne';
  autre_role?: 'lecteur_interne' | 'guide';
  eleve: Eleve;
}

export default function PlanningPersonnelTab({ guideId, eleves }: PlanningPersonnelTabProps) {
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);

  useEffect(() => {
    loadPlanningPersonnel();
  }, [guideId, eleves]);

  const loadPlanningPersonnel = async () => {
    try {
      setLoading(true);
      
      // Filtrer les élèves où la direction est impliquée (guide OU lecteur interne)
      const elevesImpliques = eleves.filter(eleve => 
        eleve.guide_id === guideId || eleve.lecteur_interne_id === guideId
      );

      // Créer la liste des défenses
      const defensesList: Defense[] = [];
      
      elevesImpliques.forEach(eleve => {
        if (eleve.date_defense && eleve.heure_defense) {
          const isGuide = eleve.guide_id === guideId;
          const isLecteurInterne = eleve.lecteur_interne_id === guideId;
          
          let role: 'guide' | 'lecteur_interne' | 'guide_et_lecteur_interne' = 'guide';
          let autre_role: 'lecteur_interne' | 'guide' | undefined;
          
          if (isGuide && isLecteurInterne) {
            role = 'guide_et_lecteur_interne';
          } else if (isGuide) {
            role = 'guide';
          } else if (isLecteurInterne) {
            role = 'lecteur_interne';
          }
          
          // Si guide et lecteur interne, déterminer le rôle secondaire pour l'affichage
          if (isGuide && isLecteurInterne) {
            autre_role = 'lecteur_interne';
          }

          defensesList.push({
            id: eleve.id,
            date: eleve.date_defense,
            heure: eleve.heure_defense,
            eleve_nom: eleve.nom,
            eleve_prenom: eleve.prenom,
            eleve_classe: eleve.classe,
            localisation: eleve.localisation_defense,
            role,
            autre_role,
            eleve
          });
        }
      });

      // Trier par date puis heure
      defensesList.sort((a, b) => {
        if (a.date !== b.date) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        return a.heure.localeCompare(b.heure);
      });

      setDefenses(defensesList);
      
      // Extraire les dates uniques pour le filtre
      const dates = [...new Set(defensesList.map(d => d.date))].sort();
      setUniqueDates(dates);

    } catch (err) {
      console.error('Erreur chargement planning personnel:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les défenses par date sélectionnée
  const filteredDefenses = selectedDate === 'all'
    ? defenses
    : defenses.filter(defense => defense.date === selectedDate);

  // Grouper les défenses par date pour l'affichage
  const defensesByDate = filteredDefenses.reduce((acc, defense) => {
    if (!acc[defense.date]) {
      acc[defense.date] = [];
    }
    acc[defense.date].push(defense);
    return acc;
  }, {} as Record<string, Defense[]>);

  // Obtenir les dates triées
  const sortedDates = Object.keys(defensesByDate).sort();

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Fonction pour obtenir la couleur du rôle
  const getRoleColor = (role: Defense['role']) => {
    switch (role) {
      case 'guide':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'lecteur_interne':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'guide_et_lecteur_interne':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Fonction pour obtenir l'icône du rôle
  const getRoleIcon = (role: Defense['role']) => {
    switch (role) {
      case 'guide':
        return <User className="w-4 h-4" />;
      case 'lecteur_interne':
        return <FileText className="w-4 h-4" />;
      case 'guide_et_lecteur_interne':
        return <Users className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  // Fonction pour obtenir le libellé du rôle
  const getRoleLabel = (role: Defense['role']) => {
    switch (role) {
      case 'guide':
        return 'Guide';
      case 'lecteur_interne':
        return 'Lecteur interne';
      case 'guide_et_lecteur_interne':
        return 'Guide & Lecteur interne';
      default:
        return 'Membre du jury';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre planning...</p>
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
            <h2 className="text-2xl font-bold text-gray-800">Planning personnel</h2>
            <p className="text-gray-600 mt-1">
              Vue d'ensemble de vos défenses TFH programmées
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
              {defenses.length} défense{defenses.length > 1 ? 's' : ''} programmée{defenses.length > 1 ? 's' : ''}
            </div>
            <button
              onClick={loadPlanningPersonnel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-800">{defenses.length}</div>
          <div className="text-sm text-gray-600">Total défenses</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-800">
            {defenses.filter(d => d.role === 'guide' || d.role === 'guide_et_lecteur_interne').length}
          </div>
          <div className="text-sm text-gray-600">En tant que guide</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-800">
            {defenses.filter(d => d.role === 'lecteur_interne' || d.role === 'guide_et_lecteur_interne').length}
          </div>
          <div className="text-sm text-gray-600">En tant que lecteur interne</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-800">{uniqueDates.length}</div>
          <div className="text-sm text-gray-600">Journées différentes</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Filtrer par date:
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="all">Toutes les dates</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredDefenses.length} défense{filteredDefenses.length > 1 ? 's' : ''} 
            {selectedDate !== 'all' ? ' pour cette date' : ' au total'}
          </div>
        </div>
      </div>

      {/* Planning par date */}
      {defenses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Aucune défense programmée</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Vous n'avez pas de défenses TFH programmées en tant que guide ou lecteur interne.
          </p>
        </div>
      ) : filteredDefenses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Aucune défense à cette date</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Aucune défense trouvée pour la date sélectionnée.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {formatDate(date)}
                  <span className="ml-auto text-sm font-medium text-gray-600">
                    {defensesByDate[date].length} défense{defensesByDate[date].length > 1 ? 's' : ''}
                  </span>
                </h3>
              </div>
              
              <div className="divide-y">
                {defensesByDate[date]
                  .sort((a, b) => a.heure.localeCompare(b.heure))
                  .map((defense) => (
                    <div key={defense.id} className="p-6 hover:bg-gray-50">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Heure et informations principales */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-lg">{defense.heure}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleColor(defense.role)}`}>
                              {getRoleIcon(defense.role)}
                              {getRoleLabel(defense.role)}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-gray-900 text-lg">
                                {defense.eleve_prenom} {defense.eleve_nom}
                              </div>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {defense.eleve_classe}
                              </span>
                            </div>
                            
                            {defense.eleve.categorie && (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {defense.eleve.categorie}
                                </span>
                              </div>
                            )}
                            
                            {defense.localisation && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4" />
                                {defense.localisation}
                              </div>
                            )}
                            
                            {defense.eleve.problematique && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-gray-500 mb-1">Problématique :</p>
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {defense.eleve.problematique}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Informations complémentaires */}
                        <div className="md:w-64 space-y-3">
                          {/* Informations sur les autres membres du jury */}
                          {(defense.eleve.guide_nom || defense.eleve.lecteur_interne_nom || defense.eleve.lecteur_externe_nom) && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-2">Composition du jury :</p>
                              <div className="space-y-1">
                                {defense.eleve.guide_nom && defense.eleve.guide_nom !== '-' && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Guide :</span>
                                    <span className="font-medium">
                                      {defense.eleve.guide_prenom} {defense.eleve.guide_nom}.
                                    </span>
                                  </div>
                                )}
                                
                                {defense.eleve.lecteur_interne_nom && defense.eleve.lecteur_interne_nom !== '-' && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Lecteur interne :</span>
                                    <span className="font-medium">
                                      {defense.eleve.lecteur_interne_prenom} {defense.eleve.lecteur_interne_nom}.
                                    </span>
                                  </div>
                                )}
                                
                                {defense.eleve.lecteur_externe_nom && defense.eleve.lecteur_externe_nom !== '-' && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Lecteur externe :</span>
                                    <span className="font-medium">
                                      {defense.eleve.lecteur_externe_prenom} {defense.eleve.lecteur_externe_nom}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Boutons d'action */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // Navigation vers l'élève dans la liste des TFH
                                window.open(`#eleve-${defense.id}`, '_blank');
                              }}
                              className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-sm font-medium"
                            >
                              Voir fiche
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Légende et informations */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Légende :</h4>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
            <User className="w-3 h-3" /> Guide
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
            <FileText className="w-3 h-3" /> Lecteur interne
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
            <Users className="w-3 h-3" /> Guide & Lecteur interne
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Ce planning affiche uniquement les TFH où vous êtes impliqué comme guide ou lecteur interne.
          Les défenses sans date/heure définie n'apparaissent pas.
        </p>
      </div>
    </div>
  );
}
