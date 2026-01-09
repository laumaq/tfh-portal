'use client';

import { useState, useEffect, useCallback } from 'react';

interface DefenseEvent {
  id: string;
  eleveId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  eleveNom: string;
  elevePrenom: string;
  guideNom: string;
  guidePrenom: string;
  lecteurInterneNom: string;
  lecteurInternePrenom: string;
  lecteurExterneNom: string;
  lecteurExternePrenom: string;
  mediateurNom: string;
  mediateurPrenom: string;
  categorie: string;
}

interface DayDefenses {
  date: string;
  displayDate: string;
  locations: string[];
  defenses: DefenseEvent[];
}

interface CalendarDisplayProps {
  eleves: any[];
  selectedCategory: string;
  selectedDates: string[];
  selectedLocations: string[];
  refreshKey: number; // Nouvelle prop pour forcer le refresh
}

export default function CalendarDisplay({ 
  eleves, 
  selectedCategory, 
  selectedDates, 
  selectedLocations,
  refreshKey 
}: CalendarDisplayProps) {
  const [dayDefenses, setDayDefenses] = useState<DayDefenses[]>([]);
  const [conflicts, setConflicts] = useState<any>({
    guides: [],
    lecteursInternes: [],
    lecteursExternes: [],
    mediateurs: []
  });

  const PIXELS_PER_HOUR = 200;

  const add50Minutes = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    let newHours = hours;
    let newMinutes = minutes + 50;
    
    if (newMinutes >= 60) {
      newHours += Math.floor(newMinutes / 60);
      newMinutes = newMinutes % 60;
    }
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (categorie: string) => {
    // ... copiez votre fonction getCategoryColor existante ...
    const colors = [
      { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
      // ... toutes vos couleurs ...
    ];
    
    if (!categorie || categorie === 'Non catégorisé') {
      return { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };
    }
    
    const hash = categorie.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % colors.length;
    
    return colors[index];
  };

  const prepareCalendarData = useCallback(() => {
    console.log('=== PRÉPARATION CALENDRIER (COMPOSANT SÉPARÉ) ===');
    console.log('Refresh key:', refreshKey);
    console.log('Nombre d\'élèves reçus:', eleves.length);
    
    const defensesWithSchedule = eleves.filter(e => 
      e.date_defense && e.heure_defense
    );
    
    console.log('Élèves avec défense programmée:', defensesWithSchedule.length);
    
    // Afficher les détails pour debug
    defensesWithSchedule.slice(0, 3).forEach((eleve, i) => {
      console.log(`Élève ${i + 1}: ${eleve.prenom} ${eleve.nom} - ${eleve.date_defense} ${eleve.heure_defense} - ${eleve.localisation_defense}`);
    });
    
    const defenseEvents: DefenseEvent[] = defensesWithSchedule.map(eleve => {
      const startTime = eleve.heure_defense!.substring(0, 5);
      
      return {
        id: eleve.id,
        eleveId: eleve.id,
        date: eleve.date_defense!,
        startTime: startTime,
        endTime: add50Minutes(startTime),
        location: eleve.localisation_defense || 'Non défini',
        eleveNom: eleve.nom,
        elevePrenom: eleve.prenom,
        guideNom: eleve.guide_nom || '-',
        guidePrenom: eleve.guide_prenom || '-',
        lecteurInterneNom: eleve.lecteur_interne_nom || '-',
        lecteurInternePrenom: eleve.lecteur_interne_prenom || '-',
        lecteurExterneNom: eleve.lecteur_externe_nom || '-',
        lecteurExternePrenom: eleve.lecteur_externe_prenom || '-',
        mediateurNom: eleve.mediateur_nom || '-',
        mediateurPrenom: eleve.mediateur_prenom || '-',
        categorie: eleve.categorie || 'Non catégorisé'
      };
    });
    
    // ... reste de votre logique de filtrage et transformation ...
    
    let filteredDefenses = defenseEvents;
    
    if (selectedCategory !== 'toutes') {
      filteredDefenses = filteredDefenses.filter(d => d.categorie === selectedCategory);
    }
    
    if (selectedDates.length > 0) {
      filteredDefenses = filteredDefenses.filter(d => selectedDates.includes(d.date));
    }
    
    if (selectedLocations.length > 0) {
      filteredDefenses = filteredDefenses.filter(d => selectedLocations.includes(d.location));
    }
    
    console.log('Défenses après filtrage:', filteredDefenses.length);
    
    // Grouper par date
    const dates = Array.from(new Set(filteredDefenses.map(d => d.date))).sort();
    
    const daysData: DayDefenses[] = dates.map(date => {
      const dateDefenses = filteredDefenses.filter(d => d.date === date);
      const locations = Array.from(new Set(dateDefenses.map(d => d.location)))
        .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
      
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        }),
        locations,
        defenses: dateDefenses.sort((a, b) => a.startTime.localeCompare(b.startTime))
      };
    });
    
    console.log('Jours avec défenses:', daysData.length);
    setDayDefenses(daysData);
    
  }, [eleves, selectedCategory, selectedDates, selectedLocations, refreshKey]);

  useEffect(() => {
    console.log('Effet déclenché dans CalendarDisplay');
    prepareCalendarData();
  }, [prepareCalendarData]);

  const pluralize = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };

  // Retournez votre JSX de calendrier existant
  return (
    <div className="space-y-8">
      {dayDefenses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            {eleves.filter(e => e.date_defense && e.heure_defense).length === 0
              ? 'Aucune défense programmée'
              : 'Aucune défense ne correspond aux filtres sélectionnés'}
          </p>
        </div>
      ) : (
        dayDefenses.map(day => {
          const totalHours = 18 - 8;
          const totalHeight = totalHours * PIXELS_PER_HOUR;
          
          return (
            <div key={day.date} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  {day.displayDate}
                </h3>
                <p className="text-sm text-gray-600">
                  {day.defenses.length} {pluralize(day.defenses.length, 'défense', 'défenses')} •  
                  {day.locations.length} {pluralize(day.locations.length, 'local', 'locaux')}
                </p>
              </div>
              
              {/* ... reste de votre rendu calendrier ... */}
            </div>
          );
        })
      )}
    </div>
  );
}
