// /app/dashboard/coordinateur/tabs/CalendrierTab.tsx

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const allDates = useMemo(() => 
    Array.from(
      new Set(
        eleves
          .filter(e => e.date_defense)
          .map(e => e.date_defense!)
          .sort()
      )
    ), [eleves]);
  
  const allLocations = useMemo(() => 
    Array.from(
      new Set(
        eleves
          .filter(e => e.localisation_defense)
          .map(e => e.localisation_defense!)
          .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)))
      )
    ), [eleves]);

  useEffect(() => {
     setSelectedCategories(categories);
  }, [categories]);

  const getFilteredDefenses = () => {
    return eleves.filter(e => 
      e.date_defense && e.heure_defense && 
      (selectedDates.length === 0 || selectedDates.includes(e.date_defense!)) &&
      (selectedLocations.length === 0 || selectedLocations.includes(e.localisation_defense!)) &&
      (selectedCategories.length === 0 || selectedCategories.includes(e.categorie!))
    );
  };

  const generatePDFContent = (mode: 'full' | 'day-location') => {
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.backgroundColor = 'white';
    
    if (mode === 'full') {
      // Pour l'export complet, on clone le contenu du calendrier
      const calendarContent = calendarRef.current?.cloneNode(true) as HTMLElement;
      if (calendarContent) {
        calendarContent.querySelectorAll('button').forEach(btn => btn.remove());
        calendarContent.querySelectorAll('.animate-spin').forEach(el => el.remove());
        calendarContent.style.overflow = 'visible';
        container.appendChild(calendarContent);
      } else {
        container.innerHTML = '<p>Aucune donnée à afficher</p>';
      }
    } else {
      // Export par jour et local
      const defenses = getFilteredDefenses();
      const grouped: Record<string, Record<string, Eleve[]>> = {};
      
      defenses.forEach(defense => {
        const date = defense.date_defense!;
        const location = defense.localisation_defense || 'Non défini';
        if (!grouped[date]) grouped[date] = {};
        if (!grouped[date][location]) grouped[date][location] = [];
        grouped[date][location].push(defense);
      });
      
      const sortedDates = Object.keys(grouped).sort();
      
      for (const date of sortedDates) {
        const locations = grouped[date];
        const sortedLocations = Object.keys(locations).sort();
        
        for (const location of sortedLocations) {
          const dayDefenses = locations[location].sort((a, b) => 
            (a.heure_defense || '').localeCompare(b.heure_defense || '')
          );
          
          const pageDiv = document.createElement('div');
          pageDiv.style.pageBreakAfter = 'always';
          pageDiv.style.marginBottom = '20px';
          
          // En-tête
          const header = document.createElement('div');
          header.style.textAlign = 'center';
          header.style.marginBottom = '20px';
          header.innerHTML = `
            <h2 style="margin: 0; color: #333;">${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            <p style="margin: 5px 0; color: #666;"><strong>Local :</strong> ${location}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Nombre de défenses :</strong> ${dayDefenses.length}</p>
          `;
          pageDiv.appendChild(header);
          
          // Tableau
          const table = document.createElement('table');
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
          table.style.marginBottom = '20px';
          
          const thead = document.createElement('thead');
          thead.innerHTML = `
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Horaire</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Élève</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Problématique</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Catégorie</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Guide</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Lecteur interne</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Lecteur externe</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Médiateur</th>
            </tr>
          `;
          table.appendChild(thead);
          
          const tbody = document.createElement('tbody');
          for (const defense of dayDefenses) {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${defense.heure_defense?.substring(0, 5) || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>${defense.prenom} ${defense.nom}</strong><br><small>${defense.classe}</small></td>
              <td style="border: 1px solid #ddd; padding: 8px; max-width: 300px;">${defense.problematique || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.categorie || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.guide_prenom || ''} ${defense.guide_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.lecteur_interne_prenom || ''} ${defense.lecteur_interne_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.lecteur_externe_prenom || ''} ${defense.lecteur_externe_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.mediateur_prenom || ''} ${defense.mediateur_nom || '-'}</td>
            `;
            tbody.appendChild(row);
          }
          table.appendChild(tbody);
          pageDiv.appendChild(table);
          
          container.appendChild(pageDiv);
        }
      }
      
      if (defenses.length === 0) {
        container.innerHTML = '<p style="text-align: center;">Aucune défense trouvée avec les filtres actuels.</p>';
      }
    }
    
    return container;
  };
  
  const handleExportFull = async () => {
    console.log('=== handleExportFull ===');
    console.log('calendarRef.current:', calendarRef.current);
    
    if (!calendarRef.current) {
      alert('Le calendrier n\'est pas encore chargé. Veuillez réessayer.');
      return;
    }
    
    setIsExporting(true);
    setShowExportOptions(false);
    
    try {
      const html2pdf = require('html2pdf.js');
      
      // Attendre un peu que le contenu soit stable
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = calendarRef.current.cloneNode(true) as HTMLElement;
      console.log('element cloné:', element);
      console.log('Contenu du calendrier:', element.innerHTML.substring(0, 500));
      
      element.style.width = '100%';
      element.style.maxWidth = '100%';
      element.style.overflow = 'visible';
      element.style.backgroundColor = 'white';
      element.style.padding = '20px';
      
      // Nettoyer les éléments interactifs
      element.querySelectorAll('button').forEach(btn => btn.remove());
      element.querySelectorAll('.animate-spin').forEach(el => el.remove());
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.appendChild(element);
      document.body.appendChild(container);
      
      // Vérifier que le contenu a été ajouté
      console.log('container enfant:', container.innerHTML.substring(0, 500));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `calendrier_complet_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: true,
          letterRendering: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
      };
      
      console.log('Génération du PDF en cours...');
      await html2pdf().from(container).set(opt).save();
      console.log('PDF généré avec succès');
      
      document.body.removeChild(container);
      
    } catch (error) {
      console.error('Erreur détaillée:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Erreur lors de l\'export: ' + errorMessage);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportByDayLocation = async () => {
    setIsExporting(true);
    setShowExportOptions(false);
    
    try {
      const html2pdf = require('html2pdf.js');
      const defenses = getFilteredDefenses();
      
      if (defenses.length === 0) {
        alert('Aucune défense à exporter avec les filtres actuels.');
        setIsExporting(false);
        return;
      }
      
      // Créer le contenu HTML
      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.backgroundColor = 'white';
      
      // Grouper par jour et local
      const grouped: Record<string, Record<string, Eleve[]>> = {};
      
      defenses.forEach(defense => {
        const date = defense.date_defense!;
        const location = defense.localisation_defense || 'Non défini';
        if (!grouped[date]) grouped[date] = {};
        if (!grouped[date][location]) grouped[date][location] = [];
        grouped[date][location].push(defense);
      });
      
      const sortedDates = Object.keys(grouped).sort();
      
      for (const date of sortedDates) {
        const locations = grouped[date];
        const sortedLocations = Object.keys(locations).sort();
        
        for (const location of sortedLocations) {
          const dayDefenses = locations[location].sort((a, b) => 
            (a.heure_defense || '').localeCompare(b.heure_defense || '')
          );
          
          // Page
          const pageDiv = document.createElement('div');
          pageDiv.style.pageBreakAfter = 'always';
          pageDiv.style.marginBottom = '20px';
          
          // En-tête
          const header = document.createElement('div');
          header.style.textAlign = 'center';
          header.style.marginBottom = '20px';
          header.innerHTML = `
            <h2 style="margin: 0; color: #333;">${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            <p style="margin: 5px 0; color: #666;"><strong>Local :</strong> ${location}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Nombre de défenses :</strong> ${dayDefenses.length}</p>
          `;
          pageDiv.appendChild(header);
          
          // Tableau
          const table = document.createElement('table');
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
          table.style.marginBottom = '20px';
          
          const thead = document.createElement('thead');
          thead.innerHTML = `
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Horaire</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Élève</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Problématique</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Catégorie</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Guide</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Lecteur interne</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Lecteur externe</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Médiateur</th>
             </tr>
          `;
          table.appendChild(thead);
          
          const tbody = document.createElement('tbody');
          for (const defense of dayDefenses) {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${defense.heure_defense?.substring(0, 5) || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>${defense.prenom} ${defense.nom}</strong><br><small>${defense.classe}</small></td>
              <td style="border: 1px solid #ddd; padding: 8px; max-width: 300px;">${(defense.problematique || '-').substring(0, 150)}${(defense.problematique || '').length > 150 ? '...' : ''}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.categorie || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.guide_prenom || ''} ${defense.guide_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.lecteur_interne_prenom || ''} ${defense.lecteur_interne_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.lecteur_externe_prenom || ''} ${defense.lecteur_externe_nom || '-'}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${defense.mediateur_prenom || ''} ${defense.mediateur_nom || '-'}</td>
            `;
            tbody.appendChild(row);
          }
          table.appendChild(tbody);
          pageDiv.appendChild(table);
          
          container.appendChild(pageDiv);
        }
      }
      
      // Ajouter au DOM
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.appendChild(container);
      document.body.appendChild(tempContainer);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `calendrier_par_jour_local_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().from(tempContainer).set(opt).save();
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('Erreur détaillée:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Erreur lors de l\'export: ' + errorMessage);
    } finally {
      setIsExporting(false);
    }
  };
  
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
    
  }, [selectedDates, selectedLocations, selectedCategories, detectConflicts]);

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

  // Ajoutez cette fonction
  const getCategoriesSummary = (): string => {
    if (selectedCategories.length === 0) return 'Aucune catégorie';
    if (selectedCategories.length === categories.length) return 'Toutes catégories';
    if (selectedCategories.length === 1) return `Catégorie: ${selectedCategories[0]}`;
    return `${selectedCategories.length} catégories`;
  };

  return (
    <div className="space-y-6">
      <ConflictDisplay conflicts={conflicts} />
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Filtres du Calendrier</h2>
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={isExporting || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <><span className="animate-spin">⟳</span> Génération...</>
              ) : (
                <><span>📄</span> Exporter PDF</>
              )}
            </button>
            
            {showExportOptions && !isExporting && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-10">
                <div className="p-2">
                  <button
                    onClick={handleExportFull}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    📊 Export complet (vue actuelle)
                  </button>
                  <button
                    onClick={handleExportByDayLocation}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    📅 Export par jour et local
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
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
            {getCategoriesSummary()}
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
          <div ref={calendarRef}>
            <CalendarDisplay
              eleves={eleves}
              selectedCategories={
                selectedCategories.length === 0 || selectedCategories.length === categories.length
                  ? ['toutes']
                  : selectedCategories
              }
              selectedDates={selectedDates}
              selectedLocations={selectedLocations}
            />
          </div>
        )}
      </div>
    </div>
  );
}
