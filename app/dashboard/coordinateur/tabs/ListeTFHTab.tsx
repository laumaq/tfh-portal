// Fichier : ./tabs/ListeTFHTab.tsx - Version avec refresh callback
'use client';

import { useState, useEffect } from 'react';
import { Eleve } from '../types';
import { ExternalLink, Edit, Save, X, ChevronDown, RefreshCw } from 'lucide-react';
import { updateEleveField } from '../utils/supabaseClient';

interface ListeTFHTabProps {
  eleves: Eleve[];
  onRefresh?: () => void; // ← Ajouter cette prop optionnelle
}

export default function ListeTFHTab({ eleves, onRefresh }: ListeTFHTabProps) {
  // États pour la gestion
  const [editingMode, setEditingMode] = useState(false);
  const [filteredClass, setFilteredClass] = useState<string>('all');
  const [elevesFiltres, setElevesFiltres] = useState<Eleve[]>([]);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  
  // Extraire toutes les classes uniques
  const classesUniques = Array.from(new Set(eleves.map(e => e.classe || '').filter(c => c))).sort();
  
  // Trier les élèves par classe, puis nom
  const elevesTries = [...eleves].sort((a, b) => {
    if (a.classe !== b.classe) {
      return (a.classe || '').localeCompare(b.classe || '');
    }
    return a.nom.localeCompare(b.nom);
  });

  // Filtrer les élèves par classe sélectionnée
  useEffect(() => {
    if (filteredClass === 'all') {
      setElevesFiltres(elevesTries);
    } else {
      setElevesFiltres(elevesTries.filter(e => e.classe === filteredClass));
    }
  }, [eleves, filteredClass]);

  // Fonction pour formater le nom complet
  const formatNomComplet = (eleve: Eleve) => {
    return `${eleve.nom.toUpperCase()} ${eleve.prenom}`;
  };

  // Fonction pour gérer le clic sur une cellule
  const handleCellClick = (eleveId: string, field: string, currentValue: string) => {
    if (!editingMode) return;
    setEditingCell({ id: eleveId, field });
    setEditValue(currentValue || '');
  };

  // Fonction pour sauvegarder une modification
  const handleSave = async (eleveId: string) => {
    if (!editingCell || !editValue.trim()) return;
    
    setIsSaving(true);
    try {
      const success = await updateEleveField(eleveId, editingCell.field, editValue.trim());
      
      if (success) {
        // Montrer le message de succès
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 2000);
        
        // Rafraîchir les données parent si disponible
        if (onRefresh) {
          setTimeout(() => onRefresh(), 100);
        }
      }
      
      setEditingCell(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la sauvegarde. Vérifiez la console.');
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour annuler l'édition
  const handleCancel = () => {
    setEditingCell(null);
  };

  // Fonction pour rendre les sources avec tooltip et édition
  const renderSources = (eleve: Eleve, index: number) => {
    const sourceFields = ['source_1', 'source_2', 'source_3', 'source_4', 'source_5'];
    
    return sourceFields.map((field, idx) => {
      const source = eleve[field as keyof Eleve] as string;
      const isEditing = editingMode && editingCell?.id === eleve.id && editingCell.field === field;
      
      if (isEditing) {
        return (
          <div key={idx} className="py-1">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border rounded"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(eleve.id);
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <button
                onClick={() => handleSave(eleve.id)}
                disabled={isSaving}
                className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                title="Sauvegarder"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Annuler"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      }
      
      if (!source || source.trim() === '') {
        return (
          <div 
            key={idx} 
            className={`py-0.5 ${editingMode ? 'cursor-pointer hover:bg-gray-50 px-1 rounded min-h-[24px]' : ''}`}
            onClick={() => editingMode && handleCellClick(eleve.id, field, '')}
          >
            <div className="text-gray-400 text-xs">-</div>
          </div>
        );
      }

      const isUrl = source.startsWith('http://') || source.startsWith('https://');
      const displayText = source.length > 40 ? `${source.substring(0, 37)}...` : source;
      
      if (isUrl) {
        return (
          <div 
            key={idx} 
            className={`py-0.5 ${editingMode ? 'cursor-pointer hover:bg-gray-50 px-1 rounded' : ''}`}
            onClick={() => editingMode && handleCellClick(eleve.id, field, source)}
          >
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-1 group"
              title={source}
              onClick={(e) => editingMode ? e.preventDefault() : null}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="truncate text-xs">{displayText}</span>
            </a>
          </div>
        );
      }

      return (
        <div 
          key={idx} 
          className={`py-0.5 ${editingMode ? 'cursor-pointer hover:bg-gray-50 px-1 rounded' : ''}`}
          onClick={() => editingMode && handleCellClick(eleve.id, field, source)}
          title={source.length > 40 ? source : undefined}
        >
          <div className="text-gray-700 text-xs truncate">{displayText}</div>
        </div>
      );
    });
  };

  // Fonction pour rendre une cellule éditable
  const renderEditableCell = (eleve: Eleve, field: keyof Eleve, value: string, isWide = false) => {
    const isEditing = editingMode && editingCell?.id === eleve.id && editingCell.field === field;
    
    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          {field === 'problematique' || field === 'thematique' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className={`flex-1 px-2 py-1 text-xs border rounded ${isWide ? 'min-h-[60px]' : 'min-h-[40px]'}`}
              autoFocus
              rows={field === 'problematique' ? 3 : 2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) handleSave(eleve.id);
                if (e.key === 'Escape') handleCancel();
              }}
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border rounded"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave(eleve.id);
                if (e.key === 'Escape') handleCancel();
              }}
            />
          )}
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => handleSave(eleve.id)}
              disabled={isSaving}
              className="px-2 py-0.5 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded disabled:opacity-50"
            >
              {isSaving ? '...' : 'Sauvegarder'}
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
            >
              Annuler
            </button>
          </div>
        </div>
      );
    }
    
    const displayValue = value || '-';
    let displayText = displayValue;
    
    if (field === 'problematique' || field === 'thematique') {
      displayText = displayValue.length > 80 ? `${displayValue.substring(0, 77)}...` : displayValue;
    } else if (field === 'categorie') {
      displayText = displayValue.length > 30 ? `${displayValue.substring(0, 27)}...` : displayValue;
    }
    
    return (
      <div 
        className={`${editingMode ? 'cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded min-h-[40px] flex items-start' : ''}`}
        onClick={() => editingMode && handleCellClick(eleve.id, field, value)}
        title={((field === 'problematique' || field === 'thematique' || field === 'categorie') && displayValue.length > 80) ? displayValue : undefined}
      >
        <div className={`text-xs ${field === 'problematique' ? 'line-clamp-3' : ''} ${field === 'thematique' ? 'line-clamp-2' : ''}`}>
          {displayText}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        {/* En-tête avec filtres et mode édition */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des TFH</h2>
            <p className="text-gray-600 mt-1">
              Vue d'ensemble de tous les travaux de fin d'humanité
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Bouton de rafraîchissement */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title="Rafraîchir les données"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            {/* Filtre par classe */}
            <div className="flex items-center gap-2">
              <label htmlFor="classFilter" className="text-sm font-medium text-gray-700">
                Classe:
              </label>
              <div className="relative">
                <select
                  id="classFilter"
                  value={filteredClass}
                  onChange={(e) => setFilteredClass(e.target.value)}
                  className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="all">Toutes</option>
                  {classesUniques.map((classe) => (
                    <option key={classe} value={classe}>
                      {classe}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            {/* Mode édition */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingMode}
                  onChange={(e) => {
                    setEditingMode(e.target.checked);
                    setEditingCell(null);
                  }}
                  className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Edit className="w-4 h-4" />
                  Mode édition
                </span>
              </label>
            </div>
            
            {/* Compteur */}
            <div className="px-3 py-1.5 bg-violet-100 text-violet-800 rounded-lg font-medium text-sm">
              {elevesFiltres.length} TFH{filteredClass !== 'all' ? ` (${filteredClass})` : ''}
            </div>
          </div>
        </div>

        {/* Message de sauvegarde réussie */}
        {showSavedMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm animate-pulse">
            ✓ Modification sauvegardée avec succès
          </div>
        )}

        {/* Tableau des TFH */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Classe
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  Élève
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Thématique
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Problématique
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Sources
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Catégorie
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elevesFiltres.map((eleve) => (
                <tr key={eleve.id} className="hover:bg-gray-50">
                  {/* Classe */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {renderEditableCell(eleve, 'classe', eleve.classe || '')}
                  </td>
                  
                  {/* Élève */}
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNomComplet(eleve)}
                    </div>
                  </td>
                  
                  {/* Thématique */}
                  <td className="px-3 py-3">
                    {renderEditableCell(eleve, 'thematique', eleve.thematique || '')}
                  </td>
                  
                  {/* Problématique */}
                  <td className="px-3 py-3">
                    {renderEditableCell(eleve, 'problematique', eleve.problematique || '', true)}
                  </td>
                  
                  {/* Sources */}
                  <td className="px-3 py-3">
                    <div className="space-y-0.5">
                      {renderSources(eleve, 1)}
                    </div>
                  </td>
                  
                  {/* Catégorie */}
                  <td className="px-3 py-3">
                    {renderEditableCell(eleve, 'categorie', eleve.categorie || '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {elevesFiltres.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">Aucun TFH trouvé</div>
            <p className="text-gray-500 text-sm">
              {filteredClass !== 'all' 
                ? `Aucun élève dans la classe ${filteredClass}`
                : 'Les données des élèves apparaîtront ici une fois importées'}
            </p>
          </div>
        )}
      </div>

      {/* Notes d'information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Mode d'emploi</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Filtre classe</strong> : Sélectionnez une classe pour afficher seulement ses TFH</li>
                <li><strong>Mode édition</strong> : Activez pour modifier thématique, problématique, sources et catégorie</li>
                <li><strong>Cliquez sur un champ</strong> en mode édition pour le modifier</li>
                <li><strong>Sources</strong> : Les URLs sont cliquables, les textes longs sont tronqués (survolez pour voir en entier)</li>
                <li><strong>Appuyez sur Entrée</strong> pour sauvegarder, Ctrl+Entrée dans les textareas, Échap pour annuler</li>
                {onRefresh && <li><strong>Bouton rafraîchir</strong> : Met à jour les données depuis la base</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
