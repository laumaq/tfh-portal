// /app/components/CalendarDisplay.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
  problematique: string;
}

interface DayDefenses {
  date: string;
  displayDate: string;
  locations: string[];
  defenses: DefenseEvent[];
}

interface CalendarDisplayProps {
  eleves: any[];
  selectedCategories: string[];
  selectedDates: string[];
  selectedLocations: string[];
  onEventClick?: (event: DefenseEvent) => void;
  selectedEventIds?: string[];
  busyEventIds?: string[];
  userLecteurExterneId?: string;
}

export default function CalendarDisplay({
  eleves,
  selectedCategories,
  selectedDates,
  selectedLocations,
  onEventClick,
  selectedEventIds = [],
  busyEventIds = [],
  userLecteurExterneId = ''
}: CalendarDisplayProps) {
  const [dayDefenses, setDayDefenses] = useState<DayDefenses[]>([]);
  const [conflicts, setConflicts] = useState<any>({
    guides: [],
    lecteursInternes: [],
    lecteursExternes: [],
    mediateurs: []
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headerScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyScrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  const PIXELS_PER_HOUR = 350;

  useEffect(() => {
    const mainEl = containerRefs.current[0]?.closest('main');
    if (!mainEl) return;

    const handleScroll = () => {
      containerRefs.current.forEach((container, i) => {
        const header = headerRefs.current[i];
        if (!container || !header) return;

        const containerTop = container.getBoundingClientRect().top;
        const containerBottom = container.getBoundingClientRect().bottom;
        const headerHeight = header.offsetHeight;

        if (containerTop < 0 && containerBottom > headerHeight) {
          header.style.transform = `translateY(${-containerTop}px)`;
        } else {
          header.style.transform = 'translateY(0)';
        }
      });
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, [dayDefenses]);

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
    const colors = [
      { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
      { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
      { bg: '#D1FAE5', border: '#34D399', text: '#065F46' },
      { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
      { bg: '#E0E7FF', border: '#A5B4FC', text: '#3730A3' },
      { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
      { bg: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E' },
      { bg: '#F3E8FF', border: '#D8B4FE', text: '#6B21A8' },
      { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' },
      { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
      { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
      { bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' },
      { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
      { bg: '#CCFBF1', border: '#5EEAD4', text: '#0F766E' },
      { bg: '#FEFCE8', border: '#FEF08A', text: '#854D0E' },
      { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' },
      { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
      { bg: '#ECFCCB', border: '#BEF264', text: '#3F6212' },
      { bg: '#FAF5FF', border: '#E9D5FF', text: '#7C3AED' },
      { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
    ];
    if (!categorie || categorie === 'Non catégorisé') {
      return { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };
    }
    const hash = categorie.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const detectConflicts = (defenses: DefenseEvent[]) => {
    const guideConflicts = new Map<string, DefenseEvent[]>();
    const lecteurInterneConflicts = new Map<string, DefenseEvent[]>();
    const lecteurExterneConflicts = new Map<string, DefenseEvent[]>();
    const mediateurConflicts = new Map<string, DefenseEvent[]>();

    const sortedDefenses = [...defenses].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    sortedDefenses.forEach(defense => {
      if (defense.guideNom && defense.guideNom !== '-') {
        const guideKey = `${defense.guidePrenom} ${defense.guideNom}`;
        const conflicts = sortedDefenses.filter(d =>
          d.id !== defense.id && d.date === defense.date &&
          d.guideNom === defense.guideNom && d.guidePrenom === defense.guidePrenom &&
          ((d.startTime <= defense.startTime && d.endTime > defense.startTime) ||
           (defense.startTime <= d.startTime && defense.endTime > d.startTime))
        );
        if (conflicts.length > 0) {
          guideConflicts.set(guideKey, [...(guideConflicts.get(guideKey) || []), defense, ...conflicts]);
        }
      }
      if (defense.lecteurInterneNom && defense.lecteurInterneNom !== '-') {
        const key = `${defense.lecteurInternePrenom} ${defense.lecteurInterneNom}`;
        const conflicts = sortedDefenses.filter(d =>
          d.id !== defense.id && d.date === defense.date &&
          d.lecteurInterneNom === defense.lecteurInterneNom && d.lecteurInternePrenom === defense.lecteurInternePrenom &&
          ((d.startTime <= defense.startTime && d.endTime > defense.startTime) ||
           (defense.startTime <= d.startTime && defense.endTime > d.startTime))
        );
        if (conflicts.length > 0) {
          lecteurInterneConflicts.set(key, [...(lecteurInterneConflicts.get(key) || []), defense, ...conflicts]);
        }
      }
      if (defense.lecteurExterneNom && defense.lecteurExterneNom !== '-') {
        const key = `${defense.lecteurExternePrenom} ${defense.lecteurExterneNom}`;
        const conflicts = sortedDefenses.filter(d =>
          d.id !== defense.id && d.date === defense.date &&
          d.lecteurExterneNom === defense.lecteurExterneNom && d.lecteurExternePrenom === defense.lecteurExternePrenom &&
          ((d.startTime <= defense.startTime && d.endTime > defense.startTime) ||
           (defense.startTime <= d.startTime && defense.endTime > d.startTime))
        );
        if (conflicts.length > 0) {
          lecteurExterneConflicts.set(key, [...(lecteurExterneConflicts.get(key) || []), defense, ...conflicts]);
        }
      }
      if (defense.mediateurNom && defense.mediateurNom !== '-') {
        const key = `${defense.mediateurPrenom} ${defense.mediateurNom}`;
        const conflicts = sortedDefenses.filter(d =>
          d.id !== defense.id && d.date === defense.date &&
          d.mediateurNom === defense.mediateurNom && d.mediateurPrenom === defense.mediateurPrenom &&
          ((d.startTime <= defense.startTime && d.endTime > defense.startTime) ||
           (defense.startTime <= d.startTime && defense.endTime > d.startTime))
        );
        if (conflicts.length > 0) {
          mediateurConflicts.set(key, [...(mediateurConflicts.get(key) || []), defense, ...conflicts]);
        }
      }
    });

    const unique = (arr: DefenseEvent[]) =>
      Array.from(new Map(arr.map(item => [item.id, item])).values());

    return {
      guides: Array.from(guideConflicts.entries()).map(([person, conflicts]) => ({ person, conflicts: unique(conflicts) })),
      lecteursInternes: Array.from(lecteurInterneConflicts.entries()).map(([person, conflicts]) => ({ person, conflicts: unique(conflicts) })),
      lecteursExternes: Array.from(lecteurExterneConflicts.entries()).map(([person, conflicts]) => ({ person, conflicts: unique(conflicts) })),
      mediateurs: Array.from(mediateurConflicts.entries()).map(([person, conflicts]) => ({ person, conflicts: unique(conflicts) }))
    };
  };

  const prepareCalendarData = useCallback(() => {
    setIsProcessing(true);
    const defensesWithSchedule = eleves.filter(e =>
      e.date_defense && e.heure_defense && e.tfh_non_rendu !== true
    );
    const defenseEvents: DefenseEvent[] = defensesWithSchedule.map(eleve => {
      const startTime = eleve.heure_defense!.substring(0, 5);
      return {
        id: eleve.id, eleveId: eleve.id,
        date: eleve.date_defense!, startTime,
        endTime: add50Minutes(startTime),
        location: eleve.localisation_defense || 'Non défini',
        eleveNom: eleve.nom, elevePrenom: eleve.prenom,
        guideNom: eleve.guide_nom || '-', guidePrenom: eleve.guide_prenom || '-',
        lecteurInterneNom: eleve.lecteur_interne_nom || '-', lecteurInternePrenom: eleve.lecteur_interne_prenom || '-',
        lecteurExterneNom: eleve.lecteur_externe_nom || '-', lecteurExternePrenom: eleve.lecteur_externe_prenom || '-',
        mediateurNom: eleve.mediateur_nom || '-', mediateurPrenom: eleve.mediateur_prenom || '-',
        categorie: eleve.categorie || 'Non catégorisé',
        problematique: eleve.problematique || ''
      };
    });

    let filteredDefenses = defenseEvents;
    if (selectedCategories.length > 0 && !selectedCategories.includes('toutes')) {
      filteredDefenses = filteredDefenses.filter(d => selectedCategories.includes(d.categorie));
    }
    if (selectedDates.length > 0) {
      filteredDefenses = filteredDefenses.filter(d => selectedDates.includes(d.date));
    }
    if (selectedLocations.length > 0) {
      filteredDefenses = filteredDefenses.filter(d => selectedLocations.includes(d.location));
    }

    setConflicts(detectConflicts(filteredDefenses));

    const dates = Array.from(new Set(filteredDefenses.map(d => d.date))).sort();
    const daysData: DayDefenses[] = dates.map(date => {
      const dateDefenses = filteredDefenses.filter(d => d.date === date);
      const locations = Array.from(new Set(dateDefenses.map(d => d.location)))
        .sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        locations,
        defenses: dateDefenses.sort((a, b) => a.startTime.localeCompare(b.startTime))
      };
    });

    setDayDefenses(daysData);
    setIsProcessing(false);
  }, [eleves, selectedCategories, selectedDates, selectedLocations]);

  useEffect(() => {
    prepareCalendarData();
  }, [prepareCalendarData]);

  const pluralize = (count: number, singular: string, plural: string) =>
    count === 1 ? singular : plural;

  if (isProcessing) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Mise à jour du calendrier...</div>
      </div>
    );
  }

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
        dayDefenses.map((day, dayIndex) => {
          const totalHours = 18 - 8;
          const totalHeight = totalHours * PIXELS_PER_HOUR;

          return (
            <div
              key={day.date}
              ref={el => { containerRefs.current[dayIndex] = el; }}
              className="bg-white rounded-lg shadow overflow-hidden"
              style={{ position: 'relative' }}
            >
              {/* En-tête */}
              <div
                ref={el => { headerRefs.current[dayIndex] = el; }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  backgroundColor: 'white',
                  willChange: 'transform',
                }}
              >
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">{day.displayDate}</h3>
                  <p className="text-sm text-gray-600">
                    {day.defenses.length} {pluralize(day.defenses.length, 'défense', 'défenses')} • {day.locations.length} {pluralize(day.locations.length, 'local', 'locaux')}
                  </p>
                </div>
                
                <div
                  ref={el => { headerScrollRefs.current[dayIndex] = el; }}
                  className="overflow-x-auto"
                  style={{ scrollbarWidth: 'none' }}
                  onScroll={e => {
                    const body = bodyScrollRefs.current[dayIndex];
                    if (body) body.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                  }}
                >
                  <div className="flex border-b border-gray-200 bg-gray-100">
                    <div className="w-[92px] flex-shrink-0 px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-200">
                      Horaire
                    </div>
                    {day.locations.map(location => (
                      <div
                        key={`header-${location}`}
                        className="flex-1 min-w-[150px] px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-200"
                      >
                        {location}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Corps */}
              <div
                ref={el => {
                  bodyScrollRefs.current[dayIndex] = el;
                  if (el && headerRefs.current[dayIndex]) {
                    el.style.paddingTop = `${headerRefs.current[dayIndex]!.offsetHeight}px`;
                  }
                }}
              >
                <div
                  className="overflow-x-auto"
                  onScroll={e => {
                    const header = headerScrollRefs.current[dayIndex];
                    if (header) header.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                  }}
                >
                  <div className="flex">
                    {/* Colonne des heures - largeur fixe */}
                    <div className="w-[92px] flex-shrink-0 bg-gray-50 border-r border-gray-200">
                      {Array.from({ length: totalHours }).map((_, i) => {
                        const hour = 8 + i;
                        return (
                          <div
                            key={`hour-${hour}`}
                            className="border-b border-gray-200"
                            style={{ height: `${PIXELS_PER_HOUR}px` }}
                          >
                            <div className="h-full flex items-center justify-center">
                              <div className="text-sm font-medium text-gray-700">{hour}h00</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  
                    {/* Colonnes des locaux */}
                    <div className="flex flex-1">
                      {day.locations.map((location) => (
                        <div
                          key={`col-${location}`}
                          className="flex-1 min-w-[200px] border-r relative"
                          style={{ height: `${totalHeight}px` }}
                        >
                          {day.defenses
                            .filter(defense => defense.location === location)
                            .map(defense => {
                              const [startHours, startMinutes] = defense.startTime.split(':').map(Number);
                              const top = (startHours - 8 + startMinutes / 60) * PIXELS_PER_HOUR;
                              const height = (50 / 60) * PIXELS_PER_HOUR;
                              const color = getCategoryColor(defense.categorie);
                              const isSelected = selectedEventIds.includes(defense.eleveId);
                              const isBusy = busyEventIds.includes(defense.eleveId);
                              const eleve = eleves.find(e => e.id === defense.eleveId);
                              const isAssignedToCurrentUser = eleve?.lecteur_externe_id === userLecteurExterneId;
                              const isClickable = onEventClick && (!isBusy || isAssignedToCurrentUser);

                              return (
                                <div
                                  key={defense.id}
                                  className={`absolute left-1 right-1 rounded p-2 overflow-y-auto border shadow-sm transition-shadow ${
                                    isClickable ? 'hover:shadow-md cursor-pointer' : ''
                                  } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${
                                    isBusy && !isAssignedToCurrentUser ? 'opacity-50' : ''
                                  }`}
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    backgroundColor: isSelected ? '#E0F2FE' : color.bg,
                                    borderColor: isSelected ? '#7DD3FC' : color.border,
                                    color: isSelected ? '#0C4A6E' : color.text,
                                    zIndex: 10,
                                    fontSize: '12px'
                                  }}
                                  onClick={() => { if (isClickable) onEventClick!(defense); }}
                                >
                                  <div className="font-bold mb-1 flex justify-between items-center sticky top-0 bg-inherit pb-1 border-b border-gray-300">
                                    <span className="text-xs">{defense.startTime} - {defense.endTime}</span>
                                    <div className="flex gap-1">
                                      {isSelected && <span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded">✓</span>}
                                      {isBusy && !isAssignedToCurrentUser && <span className="text-xs bg-red-500 text-white px-1 py-0.5 rounded">Occupé</span>}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div>
                                      <div className="font-semibold text-sm">{defense.elevePrenom} {defense.eleveNom}</div>
                                      <div className="text-xs opacity-75">{defense.categorie}</div>
                                    </div>
                                    <hr className="border-gray-400 my-1" />
                                    {defense.problematique && (
                                      <>
                                        <div className="text-xs leading-relaxed break-words">
                                          <span className="font-medium">📝</span> {defense.problematique}
                                        </div>
                                        <hr className="border-gray-400 my-1" />
                                      </>
                                    )}
                                    <div className="space-y-0.5 text-xs">
                                      {defense.guideNom !== '-' && (
                                        <div className="flex items-start gap-1">
                                          <span className="font-medium min-w-[85px]">Guide:</span>
                                          <span>{defense.guidePrenom} {defense.guideNom}</span>
                                        </div>
                                      )}
                                      {defense.lecteurInterneNom !== '-' && (
                                        <div className="flex items-start gap-1">
                                          <span className="font-medium min-w-[85px]">Lecteur interne:</span>
                                          <span>{defense.lecteurInternePrenom} {defense.lecteurInterneNom}</span>
                                        </div>
                                      )}
                                      {defense.lecteurExterneNom !== '-' && (
                                        <div className="flex items-start gap-1">
                                          <span className="font-medium min-w-[85px]">Lecteur externe:</span>
                                          <span>{defense.lecteurExternePrenom} {defense.lecteurExterneNom}</span>
                                        </div>
                                      )}
                                      {defense.mediateurNom !== '-' && (
                                        <div className="flex items-start gap-1">
                                          <span className="font-medium min-w-[85px]">Médiateur:</span>
                                          <span>{defense.mediateurPrenom} {defense.mediateurNom}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
