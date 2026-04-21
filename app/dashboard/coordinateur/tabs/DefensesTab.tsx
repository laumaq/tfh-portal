//   /app/dashboard/coordinateur/tabs/DefensesTab.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Eleve, Guide, LecteurExterne, Mediateur } from '../types';
import { formatDateForInput, add50Minutes } from '../utils/dateUtils';
import { getCategoryColor } from '../utils/categoryUtils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface DefensesTabProps {
  eleves: Eleve[];
  guides: Guide[];
  lecteursExternes: LecteurExterne[];
  mediateurs: Mediateur[];
  editingMode: boolean;
  onUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onSelectUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
  onSetEditingMode?: (mode: boolean) => void;
}

type SortField = keyof Eleve | 'guide_nom' | 'guide_prenom';
type SortDirection = 'asc' | 'desc';

export default function DefensesTab({
  eleves,
  guides,
  lecteursExternes,
  mediateurs,
  editingMode,
  onUpdate,
  onSelectUpdate,
  onRefresh,
  onSetEditingMode,
}: DefensesTabProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filtres
  const [hideWithoutGuide, setHideWithoutGuide] = useState(true);
  const [showOnlyIncompleteJury, setShowOnlyIncompleteJury] = useState(false);

  // Synchroniser les données locales
  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  // Fonction de tri avec gestion des valeurs vides en fin
  const compareValues = (valA: any, valB: any, direction: SortDirection): number => {
    const isEmpty = (v: any) => v === null || v === undefined || v === '';
    const aEmpty = isEmpty(valA);
    const bEmpty = isEmpty(valB);

    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return direction === 'asc' ? 1 : -1;  // vide en fin
    if (bEmpty) return direction === 'asc' ? -1 : 1; // vide en fin

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  const sortData = (data: Eleve[], field: SortField, direction: SortDirection): Eleve[] => {
    return [...data].sort((a, b) => {
      let valA: any, valB: any;

      switch (field) {
        case 'nom':
          valA = a.nom || '';
          valB = b.nom || '';
          break;
        case 'prenom':
          valA = a.prenom || '';
          valB = b.prenom || '';
          break;
        case 'classe':
          valA = a.classe || '';
          valB = b.classe || '';
          break;
        case 'categorie':
          valA = a.categorie || '';
          valB = b.categorie || '';
          break;
        case 'problematique':
          valA = a.problematique || '';
          valB = b.problematique || '';
          break;
        case 'guide_nom':
          valA = a.guide_nom || '';
          valB = b.guide_nom || '';
          break;
        case 'guide_prenom':
          valA = a.guide_prenom || '';
          valB = b.guide_prenom || '';
          break;
        case 'lecteur_interne_id':
          const guideA = guides.find(g => g.id === a.lecteur_interne_id);
          const guideB = guides.find(g => g.id === b.lecteur_interne_id);
          valA = guideA ? `${guideA.nom} ${guideA.initiale}.` : '';
          valB = guideB ? `${guideB.nom} ${guideB.initiale}.` : '';
          break;
        case 'lecteur_externe_id':
          const lecteurA = lecteursExternes.find(l => l.id === a.lecteur_externe_id);
          const lecteurB = lecteursExternes.find(l => l.id === b.lecteur_externe_id);
          // Trier par nom, puis prénom
          if (!lecteurA && !lecteurB) { valA = ''; valB = ''; }
          else if (!lecteurA) { valA = ''; valB = `${lecteurB?.nom} ${lecteurB?.prenom}`; }
          else if (!lecteurB) { valA = `${lecteurA.nom} ${lecteurA.prenom}`; valB = ''; }
          else {
            valA = `${lecteurA.nom} ${lecteurA.prenom}`;
            valB = `${lecteurB.nom} ${lecteurB.prenom}`;
          }
          break;
        case 'mediateur_id':
          const medA = mediateurs.find(m => m.id === a.mediateur_id);
          const medB = mediateurs.find(m => m.id === b.mediateur_id);
          if (!medA && !medB) { valA = ''; valB = ''; }
          else if (!medA) { valA = ''; valB = `${medB?.nom} ${medB?.prenom}`; }
          else if (!medB) { valA = `${medA.nom} ${medA.prenom}`; valB = ''; }
          else {
            valA = `${medA.nom} ${medA.prenom}`;
            valB = `${medB.nom} ${medB.prenom}`;
          }
          break;
        case 'date_defense':
          valA = a.date_defense ? new Date(a.date_defense).getTime() : null;
          valB = b.date_defense ? new Date(b.date_defense).getTime() : null;
          break;
        case 'heure_defense':
          valA = a.heure_defense || '';
          valB = b.heure_defense || '';
          break;
        case 'localisation_defense':
          valA = a.localisation_defense || '';
          valB = b.localisation_defense || '';
          break;
        default:
          valA = '';
          valB = '';
      }
      return compareValues(valA, valB, direction);
    });
  };

  // Application des filtres
  const filteredEleves = useMemo(() => {
    let result = [...localEleves];

    if (hideWithoutGuide) {
      result = result.filter(e => e.guide_id && e.guide_id.trim() !== '');
    }

    if (showOnlyIncompleteJury) {
      result = result.filter(e => {
        const hasGuide = e.guide_id && e.guide_id.trim() !== '';
        const hasLecteurInterne = e.lecteur_interne_id && e.lecteur_interne_id.trim() !== '';
        const hasLecteurExterne = e.lecteur_externe_id && e.lecteur_externe_id.trim() !== '';
        const hasMediateur = e.mediateur_id && e.mediateur_id.trim() !== '';
        // Jury complet = les quatre sont présents
        const juryComplet = hasGuide && hasLecteurInterne && hasLecteurExterne && hasMediateur;
        return !juryComplet;
      });
    }

    return result;
  }, [localEleves, hideWithoutGuide, showOnlyIncompleteJury]);

  const sortedEleves = useMemo(() => {
    return sortData(filteredEleves, sortField, sortDirection);
  }, [filteredEleves, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <ArrowUpDown className="w-3 h-3 ml-1 inline" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const handleLocalUpdate = async (eleveId: string, field: string, value: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await onUpdate(eleveId, field, value);
      setLocalEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
      ));
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalSelectUpdate = async (eleveId: string, field: string, value: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await onSelectUpdate(eleveId, field, value);
      setLocalEleves(prev => prev.map(eleve => 
        eleve.id === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
      ));
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryStyle = (categorie: string) => {
    const color = getCategoryColor(categorie);
    return {
      backgroundColor: color.bg,
      borderLeft: `4px solid ${color.border}`,
      color: color.text,
    };
  };

  const renderSelectOrLabel = (
    eleve: Eleve,
    field: 'lecteur_interne_id' | 'lecteur_externe_id' | 'mediateur_id',
    options: { id: string; label: string }[],
    getCurrentLabel: () => string
  ) => {
    const currentId = eleve[field] || '';
    const currentLabel = getCurrentLabel();

    if (!editingMode) {
      return <div className="text-xs md:text-sm">{currentLabel || '-'}</div>;
    }

    return (
      <select
        value={currentId}
        onChange={(e) => handleLocalSelectUpdate(eleve.id, field, e.target.value)}
        className="w-full border rounded px-2 py-1 text-xs md:text-sm"
        disabled={isProcessing}
      >
        <option value="">-</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  };

  const renderInputOrLabel = (
    eleve: Eleve,
    field: 'date_defense' | 'heure_defense' | 'localisation_defense',
    type: 'date' | 'time' | 'text',
    value: string,
    placeholder?: string
  ) => {
    if (!editingMode) {
      if (field === 'date_defense' && value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return <div>{d.toLocaleDateString('fr-FR')}</div>;
      }
      return <div>{value || '-'}</div>;
    }

    return (
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={type === 'date' ? formatDateForInput(value) : value}
          onChange={(e) => handleLocalUpdate(eleve.id, field, e.target.value)}
          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
          placeholder={placeholder}
          disabled={isProcessing}
        />
        {editingMode && value && (
          <button
            onClick={() => handleLocalUpdate(eleve.id, field, '')}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Effacer"
            disabled={isProcessing}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec mode édition et filtres */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingMode}
                onChange={(e) => onSetEditingMode?.(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">Mode édition défenses</span>
            </label>
  
            <div className="h-6 w-px bg-gray-300 hidden md:block" />
  
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideWithoutGuide}
                onChange={(e) => setHideWithoutGuide(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Masquer les TFH sans guide</span>
            </label>
  
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyIncompleteJury}
                onChange={(e) => setShowOnlyIncompleteJury(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Uniquement les jurys incomplets</span>
            </label>
          </div>
  
          <span className="text-sm text-gray-500">
            {sortedEleves.length} / {localEleves.length} élève{sortedEleves.length > 1 ? 's' : ''}
          </span>
        </div>
  
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <span className="animate-spin">⟳</span> Mise à jour en cours...
            </p>
          </div>
        )}
      </div>
  
      {/* Tableau des défenses avec tri */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[1400px] md:min-w-full">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                {[
                  { label: 'Nom', field: 'nom' as SortField },
                  { label: 'Prénom', field: 'prenom' as SortField },
                  { label: 'Classe', field: 'classe' as SortField },
                  { label: 'Catégorie', field: 'categorie' as SortField },
                  { label: 'Problématique', field: 'problematique' as SortField },
                  { label: 'Guide', field: 'guide_nom' as SortField },
                  { label: 'Lecteur Interne', field: 'lecteur_interne_id' as SortField },
                  { label: 'Lecteur Externe', field: 'lecteur_externe_id' as SortField },
                  { label: 'Médiateur', field: 'mediateur_id' as SortField },
                  { label: 'Date Défense', field: 'date_defense' as SortField },
                  { label: 'Heure Défense', field: 'heure_defense' as SortField },
                  { label: 'Localisation', field: 'localisation_defense' as SortField },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    {col.label} {getSortIcon(col.field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEleves.map((eleve) => {
                const categoryStyle = getCategoryStyle(eleve.categorie || 'Non catégorisé');
                const lecteurInterneLabel = guides.find(g => g.id === eleve.lecteur_interne_id)
                  ? `${guides.find(g => g.id === eleve.lecteur_interne_id)!.nom} ${guides.find(g => g.id === eleve.lecteur_interne_id)!.initiale}.`
                  : '';
                const lecteurExterneLabel = lecteursExternes.find(l => l.id === eleve.lecteur_externe_id)
                  ? `${lecteursExternes.find(l => l.id === eleve.lecteur_externe_id)!.nom} ${lecteursExternes.find(l => l.id === eleve.lecteur_externe_id)!.prenom}`
                  : '';
                const mediateurLabel = mediateurs.find(m => m.id === eleve.mediateur_id)
                  ? `${mediateurs.find(m => m.id === eleve.mediateur_id)!.nom} ${mediateurs.find(m => m.id === eleve.mediateur_id)!.prenom}`
                  : '';
  
                return (
                  <tr key={eleve.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">{eleve.nom}</td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.prenom}</td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.classe}</td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={categoryStyle}>
                        {eleve.categorie || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs md:text-sm max-w-xs break-words">
                      {eleve.problematique || '-'}
                    </td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {eleve.guide_nom} {eleve.guide_prenom}
                    </td>
                    <td className="px-3 py-3">
                      {renderSelectOrLabel(
                        eleve,
                        'lecteur_interne_id',
                        guides.map(g => ({ id: g.id, label: `${g.nom} ${g.initiale}.` })),
                        () => lecteurInterneLabel
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {renderSelectOrLabel(
                        eleve,
                        'lecteur_externe_id',
                        lecteursExternes.map(l => ({ id: l.id, label: `${l.nom} ${l.prenom}` })),
                        () => lecteurExterneLabel
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {renderSelectOrLabel(
                        eleve,
                        'mediateur_id',
                        mediateurs.map(m => ({ id: m.id, label: `${m.nom} ${m.prenom}` })),
                        () => mediateurLabel
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {renderInputOrLabel(eleve, 'date_defense', 'date', eleve.date_defense || '')}
                    </td>
                    <td className="px-3 py-3">
                      {renderInputOrLabel(eleve, 'heure_defense', 'time', eleve.heure_defense || '')}
                    </td>
                    <td className="px-3 py-3">
                      {renderInputOrLabel(eleve, 'localisation_defense', 'text', eleve.localisation_defense || '', 'Salle, bâtiment...')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
  
      {/* Légende */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Instructions :</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Cliquez sur les entêtes de colonnes pour trier (ascendant/descendant).</li>
          <li>• Activez le <strong>Mode édition</strong> pour modifier les défenses.</li>
          <li>• Les filtres permettent de masquer les élèves sans guide ou de n’afficher que les jurys incomplets.</li>
          <li>• Un jury est complet si un guide, un lecteur interne, un lecteur externe et un médiateur sont assignés.</li>
          <li>• Cliquez sur <strong>×</strong> pour effacer une date/heure/localisation.</li>
          <li>• Les catégories sont colorées pour une meilleure visibilité.</li>
        </ul>
      </div>
    </div>
  );
}
