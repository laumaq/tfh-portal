'use client';

import { useState, useEffect, useCallback } from 'react';
import CalendarDisplay from '@/app/components/CalendarDisplay';
import ConflictDisplay from '../components/ConflictDisplay';
import { Eleve, DefenseEvent, Conflict } from '../types';
import { getCategoryColor } from '../utils/categoryUtils';

interface CalendrierTabProps {
  eleves: Eleve[];
  categories: string[];
  onRefresh: () => void;
}

export default function CalendrierTab({
  eleves,
  categories,
  onRefresh,
}: CalendrierTabProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(allLocations);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Extraire toutes les dates uniques des défenses
  const allDates = Array.from(
    new Set(
      eleves
        .filter(e => e.date_defense)
        .map(e => e.date_defense!)
        .sort()
    )
  );

  // Extraire tous les locaux uniques
  const allLocations = Array.from(
    new Set(
      eleves
        .filter(e => e.localisation_defense)
        .map(e => e.localisation_defense!)
        .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)))
    )
  );

  // Détecter les conflits
  const detectConflicts = useCallback((defenses: DefenseEvent[]): Conflict[] => {
    const conflicts: Conflict[] = [];
    
    // Grouper par date + créneau horaire
    const defensesByDate = defenses.reduce((acc, defense) => {
      const key = `${defense.date}-${defense.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(defense);
      return acc;
    }, {} as Record<string, DefenseEvent[]>);
    
    // Fonction pour vérifier le chevauchement
    const hasOverlap = (d1: DefenseEvent, d2: DefenseEvent): boolean => {
      if (d1.date !== d2.date) return false;
      
      const toMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const start1 = toMinutes(d1.startTime);
      const end1 = toMinutes(d1.endTime);
      const start2 = toMinutes(d2.startTime);
      const end2 = toMinutes(d2.endTime);
      
      return (start1 < end2 && start2 < end1);
    };
    
    // Détecter les conflits de personnes
    const personDefensesMap = new Map<string, DefenseEvent[]>();
    
    defenses.forEach(defense => {
      // Guide
      const guideKey = `${defense.guidePrenom} ${defense.guideNom}`;
      if (guideKey.trim() !== '- -' && guideKey.trim()) {
        if (!personDefensesMap.has(guideKey)) {
          personDefensesMap.set(guideKey, []);
        }
        personDefensesMap.get(guideKey)!.push({
          ...defense,
          role: 'guide' as const
        });
      }
      
      // Lecteur interne
      const lecteurInterneKey = `${defense.lecteurInternePrenom} ${defense.lecteurInterneNom}`;
      if (lecteurInterneKey.trim() !== '- -' && lecteurInterneKey.trim() && lecteurInterneKey !== guideKey) {
        if (!personDefensesMap.has(lecteurInterneKey)) {
          personDefensesMap.set(lecteurInterneKey, []);
        }
        personDefensesMap.get(lecteurInterneKey)!.push({
          ...defense,
          role: 'lecteur_interne' as const
        });
      }
    });
    
    // Vérifier les chevauchements pour chaque personne
    personDefensesMap.forEach((personDefenses, person) => {
      if (personDefenses.length < 2) return;
      
      personDefenses.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
      
      for (let i = 0; i < personDefenses.length; i++) {
        const current = personDefenses[i];
        const overlapping: DefenseEvent[] = [current];
        
        for (let j = i + 1; j < personDefenses.length; j++) {
          const next = personDefenses[j];
          
          if (hasOverlap(current, next)) {
            overlapping.push(next);
          } else {
            break;
          }
        }
        
        if (overlapping.length >= 2) {
          const types = overlapping.map(d => {
            const isGuide = `${d.guidePrenom} ${d.guideNom}` === person;
            const isLecteurInterne = `${d.lecteurInternePrenom} ${d.lecteurInterneNom}` === person;
            
            if (isGuide && isLecteurInterne) return 'guide_et_lecteur_interne';
            if (isGuide) return 'guide';
            if (isLecteurInterne) return 'lecteur_interne';
            return 'autre';
          });
          
          let message = '';
          if (types.includes('guide') && types.includes('lecteur_interne')) {
            message = `🧑‍🏫📖 ${person} (guide & lecteur interne) a ${overlapping.length} TFH qui se chevauchent`;
          } else if (types.includes('guide')) {
            message = `🧑‍🏫 Guide ${person} a ${overlapping.length} TFH qui se chevauchent`;
          } else if (types.includes('lecteur_interne')) {
            message = `📖 Lecteur interne ${person} a ${overlapping.length} TFH qui se chevauchent`;
          } else {
            message = `${person} a ${overlapping.length} TFH qui se chevauchent`;
          }
          
          const existingConflict = conflicts.find(c => 
            c.personOrLocation === person &&
            c.conflictingDefenses.length === overlapping.length &&
            c.conflictingDefenses.every(d => overlapping.includes(d))
          );
          
          if (!existingConflict) {
            conflicts.push({
              type: 'guide',
              personOrLocation: person,
              conflictingDefenses: [...overlapping],
              message
            });
            
            i += overlapping.length - 1;
          }
        }
      }
    });
    
    // Détecter les conflits de locaux
    const localDefensesMap = new Map<string, DefenseEvent[]>();
    
    defenses.forEach(defense => {
      if (defense.location && defense.location !== 'Non défini') {
        if (!localDefensesMap.has(defense.location)) {
          localDefensesMap.set(defense.location, []);
        }
        localDefensesMap.get(defense.location)!.push(defense);
      }
    });
    
    localDefensesMap.forEach((localDefenses, location) => {
      if (localDefenses.length < 2) return;
      
      localDefenses.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
      
      for (let i = 0; i < localDefenses.length; i++) {
        const current = localDefenses[i];
        const overlapping: DefenseEvent[] = [current];
        
        for (let j = i + 1; j < localDefenses.length; j++) {
          const next = localDefenses[j];
          
          if (hasOverlap(current, next)) {
            overlapping.push(next);
          } else {
            break;
          }
        }
        
        if (overlapping.length >= 2) {
          const existingConflict = conflicts.find(c => 
            c.type === 'local' && 
            c.personOrLocation === location &&
            c.conflictingDefenses.length === overlapping.length &&
            c.conflictingDefenses.every(d => overlapping.includes(d))
          );
          
          if (!existingConflict) {
            conflicts.push({
              type: 'local',
              personOrLocation: location,
              conflictingDefenses: [...overlapping],
              message: `📍 Local "${location}" utilisé pour ${overlapping.length} TFH simultanément`
            });
            
            i += overlapping.length - 1;
          }
        }
      }
    });
    
    return conflicts.sort((a, b) => b.conflictingDefenses.length - a.conflictingDefenses.length);
  }, []);

  // Mettre à jour les conflits quand les filtres changent
  useEffect(() => {
    setIsLoading(true);

    setSelectedLocations(allLocations);
    
    // Simuler un délai pour la détection
    setTimeout(() => {
      // Ici, vous devrez calculer les défenses filtrées
      // Pour l'instant, on met un tableau vide
      const detectedConflicts = detectConflicts([]);
      setConflicts(detectedConflicts);
      setIsLoading(false);
    }, 500);
    
  }, [selectedDates, selectedLocations, selectedCategory, detectConflicts]);

  const toggleAllDates = () => {
    if (selectedDates.length === allDates.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates([...allDates]);
    }
  };

  const toggleAllLocations = () => {
    if (selectedLocations.length === allLocations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations([...allLocations]);
    }
  };

  const pluralize = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };

  return (
    <div className="space-y-6">
      {/* Affichage des conflits */}
      <ConflictDisplay conflicts={conflicts} />
      
      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Filtres du Calendrier</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Filtre des jours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner les jours
            </label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {allDates.map(date => (
                <div key={date} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id={`date-${date}`}
                    checked={selectedDates.includes(date)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDates([...selectedDates, date]);
                      } else {
                        setSelectedDates(selectedDates.filter(d => d !== date));
                      }
                    }}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <label htmlFor={`date-${date}`} className="text-sm">
                    {new Date(date).toLocaleDateString('fr-FR', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </label>
                </div>
              ))}
              {allDates.length === 0 && (
                <p className="text-sm text-gray-500">Aucune date de défense programmée</p>
              )}
            </div>
            <button
              onClick={toggleAllDates}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              disabled={isLoading || allDates.length === 0}
            >
              {selectedDates.length === allDates.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
          
          {/* Filtre des catégories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégories (sélection multiple)
            </label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {categories.map(cat => {
                const color = getCategoryColor(cat);
                const isSelected = selectedCategories.includes(cat);
                const allSelected = selectedCategories.length === categories.length;
                
                return (
                  <div key={cat} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`cat-${cat}`}
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== cat));
                        }
                      }}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    <label 
                      htmlFor={`cat-${cat}`} 
                      className="text-sm cursor-pointer flex items-center group"
                    >
                      <div 
                        className="w-4 h-4 rounded mr-2 border group-hover:opacity-80 transition-opacity"
                        style={{ 
                          backgroundColor: color.bg,
                          borderColor: color.border
                        }}
                        title={cat}
                      ></div>
                      <span className="truncate">{cat}</span>
                    </label>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <p className="text-sm text-gray-500">Aucune catégorie définie</p>
              )}
            </div>
            <button
              onClick={() => {
                if (selectedCategories.length === categories.length) {
                  setSelectedCategories([]);
                } else {
                  setSelectedCategories([...categories]);
                }
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              disabled={isLoading || categories.length === 0}
            >
              {selectedCategories.length === categories.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
          
          {/* Filtre des locaux */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner les locaux
            </label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {allLocations.map(location => (
                <div key={location} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id={`loc-${location}`}
                    checked={selectedLocations.includes(location)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLocations([...selectedLocations, location]);
                      } else {
                        setSelectedLocations(selectedLocations.filter(l => l !== location));
                      }
                    }}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <label htmlFor={`loc-${location}`} className="text-sm truncate">
                    {location}
                  </label>
                </div>
              ))}
              {allLocations.length === 0 && (
                <p className="text-sm text-gray-500">Aucun local défini</p>
              )}
            </div>
            <button
              onClick={toggleAllLocations}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              disabled={isLoading || allLocations.length === 0}
            >
              {selectedLocations.length === allLocations.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
        </div>
        
        {/* Résumé des filtres */}
        <div className="text-sm text-gray-600">
          <p>
            Affichage de {allDates.length} {pluralize(allDates.length, 'jour', 'jours')}
            {' • '}
            {selectedLocations.length > 0 
              ? `${selectedLocations.length} ${pluralize(selectedLocations.length, 'local', 'locaux')} sélectionné${selectedLocations.length > 1 ? 's' : ''}`
              : 'Tous les locaux'}
            {' • '}
            {selectedCategory === 'toutes' ? 'Toutes catégories' : `Catégorie: ${selectedCategory}`}
          </p>
          {conflicts.length > 0 && (
            <p className="mt-1 text-amber-600 font-medium">
              ⚠️ {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} détecté{conflicts.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
      
      {/* Calendrier */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Vue Calendrier</h3>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⟳</span>
                Chargement...
              </>
            ) : (
              <>
                <span>🔄</span>
                Rafraîchir
              </>
            )}
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Détection des conflits en cours...</p>
            </div>
          </div>
        ) : (
          <CalendarDisplay
            eleves={eleves}
            selectedCategory={selectedCategory}
            selectedDates={selectedDates}
            selectedLocations={selectedLocations}
          />
        )}
      </div>
    </div>
  );
}
