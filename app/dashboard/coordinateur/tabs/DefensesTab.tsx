'use client';

import { useState, useEffect, useMemo } from 'react';
import { Eleve, Guide, LecteurExterne, Mediateur } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
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

type SortField = 
  | 'classe'
  | 'nom'
  | 'prenom'
  | 'categorie'
  | 'problematique'
  | 'guide_nom'
  | 'lecteur_interne_id'
  | 'lecteur_externe_id'
  | 'mediateur_id'
  | 'date_defense'
  | 'heure_defense'
  | 'localisation_defense';

interface SortRule {
  field: SortField;
  direction: 'asc' | 'desc';
}

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
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { field: 'classe', direction: 'asc' },
    { field: 'nom', direction: 'asc' }
  ]);
  const [hideWithoutGuide, setHideWithoutGuide] = useState(true);
  const [showOnlyIncompleteJury, setShowOnlyIncompleteJury] = useState(false);

  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  const getFieldValue = (eleve: Eleve, field: SortField): any => {
    switch (field) {
      case 'classe': return eleve.classe || '';
      case 'nom': return eleve.nom || '';
      case 'prenom': return eleve.prenom || '';
      case 'categorie': return eleve.categorie || '';
      case 'problematique': return eleve.problematique || '';
      case 'guide_nom': return eleve.guide_nom || '';
      case 'lecteur_interne_id': {
        const guide = guides.find(g => g.id === eleve.lecteur_interne_id);
        return guide ? `${guide.nom} ${guide.initiale}.` : '';
      }
      case 'lecteur_externe_id': {
        const lecteur = lecteursExternes.find(l => l.id === eleve.lecteur_externe_id);
        return lecteur ? `${lecteur.nom} ${lecteur.prenom}` : '';
      }
      case 'mediateur_id': {
        const med = mediateurs.find(m => m.id === eleve.mediateur_id);
        return med ? `${med.nom} ${med.prenom}` : '';
      }
      case 'date_defense':
        return eleve.date_defense ? new Date(eleve.date_defense).getTime() : null;
      case 'heure_defense': return eleve.heure_defense || '';
      case 'localisation_defense': return eleve.localisation_defense || '';
      default: return '';
    }
  };

  const compareValues = (valA: any, valB: any, direction: 'asc' | 'desc'): number => {
    const isEmpty = (v: any) => v === null || v === undefined || v === '';
    const aEmpty = isEmpty(valA);
    const bEmpty = isEmpty(valB);

    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return direction === 'asc' ? 1 : -1;
    if (bEmpty) return direction === 'asc' ? -1 : 1;

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  const sortData = (data: Eleve[], rules: SortRule[]): Eleve[] => {
    return [...data].sort((a, b) => {
      for (const rule of rules) {
        const valA = getFieldValue(a, rule.field);
        const valB = getFieldValue(b, rule.field);
        const cmp = compareValues(valA, valB, rule.direction);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  };

  const filteredAndSortedEleves = useMemo(() => {
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
        const juryComplet = hasGuide && hasLecteurInterne && hasLecteurExterne && hasMediateur;
        return !juryComplet;
      });
    }
    return sortData(result, sortRules);
  }, [localEleves, hideWithoutGuide, showOnlyIncompleteJury, sortRules]);

  const handleSort = (field: SortField) => {
    const currentFirst = sortRules[0];
    let newDirection: 'asc' | 'desc';
    if (currentFirst.field === field) {
      newDirection = currentFirst.direction === 'asc' ? 'desc' : 'asc';
    } else {
      newDirection = 'asc';
    }
    setSortRules([
      { field, direction: newDirection },
      { field: 'classe', direction: 'asc' },
      { field: 'nom', direction: 'asc' }
    ]);
  };

  const getSortIcon = (field: SortField) => {
    const firstRule = sortRules[0];
    if (firstRule.field !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline" />;
    return firstRule.direction === 'asc'
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
      console.error(err);
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
      console.error(err);
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
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
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
            {filteredAndSortedEleves.length} / {localEleves.length} élève{filteredAndSortedEleves.length > 1 ? 's' : ''}
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

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[1400px] md:min-w-full">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th onClick={() => handleSort('classe')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Classe {getSortIcon('classe')}
                </th>
                <th onClick={() => handleSort('nom')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Élève {getSortIcon('nom')}
                </th>
                <th onClick={() => handleSort('categorie')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Catégorie {getSortIcon('categorie')}
                </th>
                <th onClick={() => handleSort('problematique')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Problématique {getSortIcon('problematique')}
                </th>
                <th onClick={() => handleSort('guide_nom')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Guide {getSortIcon('guide_nom')}
                </th>
                <th onClick={() => handleSort('lecteur_interne_id')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Lecteur Interne {getSortIcon('lecteur_interne_id')}
                </th>
                <th onClick={() => handleSort('lecteur_externe_id')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Lecteur Externe {getSortIcon('lecteur_externe_id')}
                </th>
                <th onClick={() => handleSort('mediateur_id')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Médiateur {getSortIcon('mediateur_id')}
                </th>
                <th onClick={() => handleSort('date_defense')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Date Défense {getSortIcon('date_defense')}
                </th>
                <th onClick={() => handleSort('heure_defense')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Heure Défense {getSortIcon('heure_defense')}
                </th>
                <th onClick={() => handleSort('localisation_defense')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Localisation {getSortIcon('localisation_defense')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEleves.map((eleve) => {
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
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.classe || '-'}</td>
                    <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">
                      {eleve.nom ? `${eleve.nom.toUpperCase()} ${eleve.prenom}` : eleve.prenom || '-'}
                    </td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={categoryStyle}>
                        {eleve.categorie || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs md:text-sm max-w-xs break-words">{eleve.problematique || '-'}</td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {eleve.guide_nom ? `${eleve.guide_nom} ${eleve.guide_prenom}` : '-'}
                    </td>
                    <td className="px-3 py-3">
                      {renderSelectOrLabel(eleve, 'lecteur_interne_id', guides.map(g => ({ id: g.id, label: `${g.nom} ${g.initiale}.` })), () => lecteurInterneLabel)}
                    </td>
                    <td className="px-3 py-3">
                      {renderSelectOrLabel(eleve, 'lecteur_externe_id', lecteursExternes.map(l => ({ id: l.id, label: `${l.nom} ${l.prenom}` })), () => lecteurExterneLabel)}
                    </td>
                    <td className="px-3 py-3">
                      {renderSelectOrLabel(eleve, 'mediateur_id', mediateurs.map(m => ({ id: m.id, label: `${m.nom} ${m.prenom}` })), () => mediateurLabel)}
                    </td>
                    <td className="px-3 py-3">{renderInputOrLabel(eleve, 'date_defense', 'date', eleve.date_defense || '')}</td>
                    <td className="px-3 py-3">{renderInputOrLabel(eleve, 'heure_defense', 'time', eleve.heure_defense || '')}</td>
                    <td className="px-3 py-3">{renderInputOrLabel(eleve, 'localisation_defense', 'text', eleve.localisation_defense || '', 'Salle, bâtiment...')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Instructions :</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Cliquez sur les entêtes pour trier (la colonne choisie passe en premier, puis classe, puis nom).</li>
          <li>• Activez le <strong>Mode édition</strong> pour modifier les défenses.</li>
          <li>• Les filtres permettent de masquer les élèves sans guide ou de n’afficher que les jurys incomplets.</li>
          <li>• Un jury est complet si guide, lecteur interne, lecteur externe et médiateur sont assignés.</li>
          <li>• Cliquez sur <strong>×</strong> pour effacer une date/heure/localisation.</li>
        </ul>
      </div>
    </div>
  );
}
