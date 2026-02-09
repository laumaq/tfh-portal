// Fichier : app/dashboard/direction/tabs/ListeTFHTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eleve } from '../../coordinateur/types'; 
import { ExternalLink, ChevronDown } from 'lucide-react'; 

interface ListeTFHTabProps {
  eleves: Eleve[];
  onRefresh: () => void; // Retiré onUpdate
}

export default function ListeTFHTab({ eleves, onRefresh }: ListeTFHTabProps) {
  // États pour la gestion - Retiré editingMode
  const [filteredClass, setFilteredClass] = useState<string>('all');
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  
  // Extraire toutes les classes uniques
  const classesUniques = Array.from(new Set(eleves.map(e => e.classe || '').filter(c => c))).sort();
  
  // Trier les élèves par classe, puis nom
  const elevesTries = [...eleves].sort((a, b) => {
    if (a.classe !== b.classe) {
      return (a.classe || '').localeCompare(b.classe || '');
    }
    return a.nom.localeCompare(b.nom);
  });

  // Synchroniser les données locales
  useEffect(() => {
    setLocalEleves(elevesTries);
  }, [eleves]);

  // Filtrer les élèves par classe sélectionnée
  const elevesFiltres = filteredClass === 'all' 
    ? localEleves 
    : localEleves.filter(e => e.classe === filteredClass);

  // Fonction pour formater le nom complet
  const formatNomComplet = (eleve: Eleve) => {
    return `${eleve.nom.toUpperCase()} ${eleve.prenom}`;
  };

  // Fonction pour rendre les sources en lecture seule
  const renderSources = (eleve: Eleve) => {
    const sourceFields = ['source_1', 'source_2', 'source_3', 'source_4', 'source_5'];
    
    return sourceFields.map((field, idx) => {
      const source = eleve[field as keyof Eleve] as string;
      
      if (!source || source.trim() === '') {
        return (
          <div key={idx} className="py-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex-1 text-xs text-gray-400 italic px-2 py-1">
                Source {idx + 1} non définie
              </span>
            </div>
          </div>
        );
      }

      const isUrl = source.startsWith('http://') || source.startsWith('https://');
      const displayText = source.length > 40 ? `${source.substring(0, 37)}...` : source;
      
      return (
        <div key={idx} className="py-0.5">
          <div className="flex items-center justify-between gap-2">
            {isUrl ? (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                title={source}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs truncate">{displayText}</span>
              </a>
            ) : (
              <span 
                className="flex-1 text-xs px-2 py-1 truncate"
                title={source.length > 40 ? source : undefined}
              >
                {displayText}
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  // Fonction pour rendre une cellule en lecture seule
  const renderReadOnlyCell = (field: keyof Eleve, value: string) => {
    const displayValue = value || '';
    
    // Cas spécial pour problématique (texte plus long)
    if (field === 'problematique') {
      return (
        <div className="relative">
          <div className="w-full text-xs px-2 py-1 min-h-[120px] overflow-y-auto bg-transparent">
            {displayValue || (
              <span className="text-gray-400 italic">Non définie</span>
            )}
          </div>
        </div>
      );
    }
    
    // Pour tous les autres champs
    return (
      <div className="relative">
        <div className="w-full text-xs px-2 py-1 bg-transparent truncate">
          {displayValue || (
            <span className="text-gray-400 italic">
              {field === 'classe' ? 'Non définie' : 
               field === 'thematique' ? 'Non définie' : 
               field === 'categorie' ? 'Non définie' : 'Non défini'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        {/* En-tête avec filtres - Retiré mode édition */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des TFH - Direction</h2>
            <p className="text-gray-600 mt-1">
              Vue d'ensemble de tous les travaux de fin d'humanité (lecture seule)
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
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
            
            {/* Note sur les droits */}
            <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
              📋 Vue lecture seule
            </div>
            
            {/* Compteur */}
            <div className="px-3 py-1.5 bg-violet-100 text-violet-800 rounded-lg font-medium text-sm">
              {elevesFiltres.length} TFH{filteredClass !== 'all' ? ` (${filteredClass})` : ''}
            </div>
          </div>
        </div>

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
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  Problématique
                </th> 
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">
                  Sources
                </th> 
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Catégorie
                </th>
              </tr>  
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elevesFiltres.map((eleve) => (
                <tr key={eleve.id} className="hover:bg-gray-50">
                  {/* Classe */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {renderReadOnlyCell('classe', eleve.classe || '')}
                  </td>
                  
                  {/* Élève */}
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNomComplet(eleve)}
                    </div>
                    {eleve.guide_nom && eleve.guide_nom !== '-' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Guide: {eleve.guide_prenom} {eleve.guide_nom}.
                      </div>
                    )}
                  </td>
                  
                  {/* Thématique */}
                  <td className="px-3 py-3">
                    <div className="text-sm">
                      {renderReadOnlyCell('thematique', eleve.thematique || '')}
                    </div>
                  </td>
                  
                  {/* Problématique */}
                  <td className="px-3 py-3">
                    <div className="text-sm">
                      {renderReadOnlyCell('problematique', eleve.problematique || '')}
                    </div>
                  </td>
                  
                  {/* Sources */}
                  <td className="px-3 py-3">
                    <div className="text-sm space-y-1">
                      {renderSources(eleve)}
                    </div>
                  </td>
                  
                  {/* Catégorie */}
                  <td className="px-3 py-3">
                    {renderReadOnlyCell('categorie', eleve.categorie || '')}
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

      {/* Notes d'information modifiées */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Mode d'emploi - Direction</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Filtre classe</strong> : Sélectionnez une classe pour afficher seulement ses TFH</li>
                <li><strong>Vue lecture seule</strong> : Les données sont affichées en consultation seulement</li>
                <li><strong>Sources</strong> : Les URLs sont cliquables et s'ouvrent dans un nouvel onglet</li>
                <li><strong>Modifications</strong> : Les modifications doivent être effectuées par un coordinateur</li>
                <li><strong>Contact</strong> : Pour toute modification, contactez l'administration TFH</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Section avec les droits d'accès */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Informations sur les droits d'accès :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Vous avez accès à la liste complète des TFH en lecture seule</li>
              <li>Pour modifier les données, veuillez contacter un coordinateur</li>
              <li>Les sources cliquables permettent de vérifier les références bibliographiques</li>
              <li>Utilisez le filtre de classe pour naviguer efficacement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
