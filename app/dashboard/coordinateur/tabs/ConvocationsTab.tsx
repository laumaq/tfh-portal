'use client';

import { useState, useEffect } from 'react';
import { Eleve, Guide } from '../types';
import { CONVOCATION_OPTIONS } from '../constants';
import { 
  getConvocationColor, 
  getConvocationLabel, 
  getPresenceStyles
} from '../utils/convocationUtils';

interface ConvocationsTabProps {
  eleves: Eleve[];
  guides: Guide[];
  categories: string[];
  editingMode: boolean;
  editingCell: {id: string, field: string} | null;
  onUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onSelectUpdate: (eleveId: string, field: string, value: string) => Promise<void>;
  onPresenceUpdate: (
    eleveId: string, 
    field: string, 
    currentValue: boolean | null,
    onSuccess?: (newValue: boolean | null) => void // ← Optionnel maintenant
  ) => Promise<void>;
  onRefresh: () => void;
  onSetEditingCell: (cell: {id: string, field: string} | null) => void;
  onSetEditingMode: (mode: boolean) => void;
}

export default function ConvocationsTab({
  eleves,
  guides,
  categories,
  editingMode,
  editingCell,
  onUpdate,
  onSelectUpdate,
  onPresenceUpdate,
  onRefresh,
  onSetEditingCell,
  onSetEditingMode
}: ConvocationsTabProps) {
  const [newCategory, setNewCategory] = useState('');
  const [showConvoques, setShowConvoques] = useState(false);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [isProcessing, setIsProcessing] = useState(false);

  // Synchroniser les données locales avec les données parent
  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      // Cette fonctionnalité sera implémentée plus tard
      alert('Ajout de catégorie à implémenter');
      setNewCategory('');
    }
  };

  const handleLocalUpdate = async (eleveId: string, field: string, value: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Mise à jour OPTIMISÉE : pas de rechargement complet
      await onUpdate(eleveId, field, value);
      
      // Mise à jour locale IMMÉDIATE (sans recharger tout)
      setLocalEleves(prev => prev.map(eleve => 
        eleve.id === eleveId 
          ? { ...eleve, [field]: value === '' ? null : value }
          : eleve
      ));
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      // En cas d'erreur, recharger pour avoir l'état correct
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
      
      // Mise à jour locale IMMÉDIATE
      setLocalEleves(prev => prev.map(eleve => 
        eleve.id === eleveId 
          ? { ...eleve, [field]: value === '' ? null : value }
          : eleve
      ));
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalPresenceUpdate = async (
    eleveId: string, 
    field: string, 
    currentValue: boolean | null
  ) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Utiliser la fonction optimisée avec callback
      await onPresenceUpdate(eleveId, field, currentValue, (newValue) => {
        // Mise à jour locale IMMÉDIATE avec la nouvelle valeur
        setLocalEleves(prev => prev.map(eleve => 
          eleve.id === eleveId 
            ? { ...eleve, [field]: newValue }
            : eleve
        ));
      });
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour présence:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrer les élèves selon le filtre "convoqués"
  const filteredEleves = showConvoques 
    ? localEleves.filter(e => e.convocation_mars?.startsWith('Oui') || e.convocation_avril?.startsWith('Oui'))
    : localEleves;

  return (
    <>
      {/* Indicateur de chargement léger */}
      {isProcessing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          Mise à jour en cours...
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConvoques}
                onChange={(e) => setShowConvoques(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">
                Afficher uniquement les élèves convoqués
              </span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingMode}
                onChange={(e) => onSetEditingMode(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">
                Mode édition
              </span>
            </label>
          </div>
          
          <span className="text-sm text-gray-500">
            ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''})
          </span>
        </div>
        
        {/* Légende des couleurs */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Légende des convocations:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
                  <div key={opt.value} className={`${opt.color} px-3 py-2 rounded-lg text-xs font-medium flex items-start gap-2`}>
                    <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{
                      backgroundColor: opt.color.includes('green') ? '#10B981' :
                                     opt.color.includes('yellow') ? '#F59E0B' :
                                     opt.color.includes('orange') ? '#F97316' :
                                     opt.color.includes('red') ? '#EF4444' : '#6B7280'
                    }}></div>
                    <span className="leading-tight">{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Légende de présence:</p>
              <div className="flex flex-wrap gap-2">
                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200">?</span>
                  Non défini
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-200">✓</span>
                  Présent
                </div>
                <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-200">✗</span>
                  Absent
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {editingMode ? 'Cliquez pour faire tourner: ? → ✓ → ✗ → ?' : 'Activez le mode édition pour modifier'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des convocations */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[1300px] md:min-w-full">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Classe</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Nom</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prénom</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Guide</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Catégorie</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Problématique</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Convoc. 9-10 mars</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 9 mars</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 10 mars</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Convoc. 16-17 avril</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 16 avril</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prés. 17 avril</th>
              </tr>
            </thead>
            <tbody>
              {filteredEleves.map((eleve) => {
                const presence9Mars = getPresenceStyles(eleve.presence_9_mars);
                const presence10Mars = getPresenceStyles(eleve.presence_10_mars);
                const presence16Avril = getPresenceStyles(eleve.presence_16_avril);
                const presence17Avril = getPresenceStyles(eleve.presence_17_avril);
                
                return (
                  <tr key={eleve.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.classe}</td>
                    <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">{eleve.nom}</td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.prenom}</td>
                    
                    {/* Guide */}
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {editingMode ? (
                        <select
                          value={eleve.guide_id || ''}
                          onChange={(e) => handleLocalSelectUpdate(eleve.id, 'guide_id', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          disabled={isProcessing}
                        >
                          <option value="">-</option>
                          {guides.map(guide => (
                            <option key={guide.id} value={guide.id}>
                              {guide.nom} {guide.prenom}.
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>
                          {eleve.guide_nom} {eleve.guide_prenom}.
                        </span>
                      )}
                    </td>
                    
                    {/* Catégorie */}
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {editingMode ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={eleve.categorie || ''}
                            onChange={(e) => handleLocalSelectUpdate(eleve.id, 'categorie', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                            disabled={isProcessing}
                          >
                            <option value="">-</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              placeholder="Nouvelle catégorie"
                              className="flex-1 border rounded px-2 py-1 text-xs"
                              disabled={isProcessing}
                            />
                            <button
                              onClick={handleAddCategory}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 disabled:opacity-50"
                              disabled={isProcessing}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span>{eleve.categorie || '-'}</span>
                      )}
                    </td>
                    
                    {/* Problématique */}
                    <td className="px-3 py-3 text-xs md:text-sm">
                      {editingMode && editingCell?.id === eleve.id && editingCell?.field === 'problematique' ? (
                        <textarea
                          defaultValue={eleve.problematique}
                          onBlur={(e) => handleLocalUpdate(eleve.id, 'problematique', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          rows={3}
                          autoFocus
                          disabled={isProcessing}
                        />
                      ) : editingMode ? (
                        <div
                          onClick={() => !isProcessing && onSetEditingCell({id: eleve.id, field: 'problematique'})}
                          className={`cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px] flex items-start ${
                            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {eleve.problematique || '-'}
                        </div>
                      ) : (
                        <div className="min-h-[60px] flex items-start">
                          {eleve.problematique || '-'}
                        </div>
                      )}
                    </td>
                    
                    {/* Convocation Mars */}
                    <td className="px-3 py-3">
                      {editingMode ? (
                        <select
                          value={eleve.convocation_mars || ''}
                          onChange={(e) => handleLocalUpdate(eleve.id, 'convocation_mars', e.target.value)}
                          className={`w-full border rounded px-2 py-1 text-xs md:text-sm ${getConvocationColor(eleve.convocation_mars || '')}`}
                          title={getConvocationLabel(eleve.convocation_mars || '')}
                          disabled={isProcessing}
                        >
                          {CONVOCATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className={opt.color}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className={`px-2 py-1 rounded ${getConvocationColor(eleve.convocation_mars || '')}`}>
                          {getConvocationLabel(eleve.convocation_mars || '').split(',')[0]}
                        </div>
                      )}
                    </td>
                    
                    {/* Présence 9 mars */}
                    <td className="px-3 py-3 text-center">
                      {editingMode ? (
                        <button
                          onClick={() => !isProcessing && handleLocalPresenceUpdate(eleve.id, 'presence_9_mars', eleve.presence_9_mars)}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence9Mars.bgColor} ${presence9Mars.hoverColor} ${presence9Mars.textColor} font-bold text-lg ${
                            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={`${presence9Mars.title} (cliquer pour changer)`}
                          disabled={isProcessing}
                        >
                          {presence9Mars.icon}
                        </button>
                      ) : (
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence9Mars.bgColor} ${presence9Mars.textColor} font-bold text-lg`}>
                          {presence9Mars.icon}
                        </div>
                      )}
                    </td>
                    
                    {/* Présence 10 mars */}
                    <td className="px-3 py-3 text-center">
                      {editingMode ? (
                        <button
                          onClick={() => !isProcessing && handleLocalPresenceUpdate(eleve.id, 'presence_10_mars', eleve.presence_10_mars)}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence10Mars.bgColor} ${presence10Mars.hoverColor} ${presence10Mars.textColor} font-bold text-lg ${
                            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={`${presence10Mars.title} (cliquer pour changer)`}
                          disabled={isProcessing}
                        >
                          {presence10Mars.icon}
                        </button>
                      ) : (
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence10Mars.bgColor} ${presence10Mars.textColor} font-bold text-lg`}>
                          {presence10Mars.icon}
                        </div>
                      )}
                    </td>
                    
                    {/* Convocation Avril */}
                    <td className="px-3 py-3">
                      {editingMode ? (
                        <select
                          value={eleve.convocation_avril || ''}
                          onChange={(e) => handleLocalUpdate(eleve.id, 'convocation_avril', e.target.value)}
                          className={`w-full border rounded px-2 py-1 text-xs md:text-sm ${getConvocationColor(eleve.convocation_avril || '')}`}
                          title={getConvocationLabel(eleve.convocation_avril || '')}
                          disabled={isProcessing}
                        >
                          {CONVOCATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className={opt.color}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className={`px-2 py-1 rounded ${getConvocationColor(eleve.convocation_avril || '')}`}>
                          {getConvocationLabel(eleve.convocation_avril || '').split(',')[0]}
                        </div>
                      )}
                    </td>
                    
                    {/* Présence 16 avril */}
                    <td className="px-3 py-3 text-center">
                      {editingMode ? (
                        <button
                          onClick={() => !isProcessing && handleLocalPresenceUpdate(eleve.id, 'presence_16_avril', eleve.presence_16_avril)}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence16Avril.bgColor} ${presence16Avril.hoverColor} ${presence16Avril.textColor} font-bold text-lg ${
                            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={`${presence16Avril.title} (cliquer pour changer)`}
                          disabled={isProcessing}
                        >
                          {presence16Avril.icon}
                        </button>
                      ) : (
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence16Avril.bgColor} ${presence16Avril.textColor} font-bold text-lg`}>
                          {presence16Avril.icon}
                        </div>
                      )}
                    </td>
                    
                    {/* Présence 17 avril */}
                    <td className="px-3 py-3 text-center">
                      {editingMode ? (
                        <button
                          onClick={() => !isProcessing && handleLocalPresenceUpdate(eleve.id, 'presence_17_avril', eleve.presence_17_avril)}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${presence17Avril.bgColor} ${presence17Avril.hoverColor} ${presence17Avril.textColor} font-bold text-lg ${
                            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={`${presence17Avril.title} (cliquer pour changer)`}
                          disabled={isProcessing}
                        >
                          {presence17Avril.icon}
                        </button>
                      ) : (
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${presence17Avril.bgColor} ${presence17Avril.textColor} font-bold text-lg`}>
                          {presence17Avril.icon}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
