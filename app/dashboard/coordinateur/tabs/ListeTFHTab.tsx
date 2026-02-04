// Fichier : ./tabs/ListeTFHTab.tsx
'use client';

import { Eleve } from '../types';
import { ExternalLink } from 'lucide-react';

interface ListeTFHTabProps {
  eleves: Eleve[];
}

export default function ListeTFHTab({ eleves }: ListeTFHTabProps) {
  // Trier les élèves par classe, puis nom
  const elevesTries = [...eleves].sort((a, b) => {
    // Trier par classe
    if (a.classe !== b.classe) {
      return a.classe.localeCompare(b.classe);
    }
    // Puis par nom (majuscules)
    return a.nom.localeCompare(b.nom);
  });

  // Fonction pour formater le nom complet
  const formatNomComplet = (eleve: Eleve) => {
    return `${eleve.nom.toUpperCase()} ${eleve.prenom}`;
  };

  // Fonction pour traiter les sources
  const renderSources = (eleve: Eleve) => {
    const sources = [
      eleve.source_1,
      eleve.source_2,
      eleve.source_3,
      eleve.source_4,
      eleve.source_5,
    ];

    return sources.map((source, index) => {
      if (!source || source.trim() === '') {
        return (
          <div key={index} className="text-gray-400 py-0.5">
            -
          </div>
        );
      }

      // Vérifier si c'est une URL
      const isUrl = source.startsWith('http://') || source.startsWith('https://');
      
      if (isUrl) {
        return (
          <div key={index} className="py-0.5">
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Source {index + 1}
            </a>
          </div>
        );
      }

      // Si ce n'est pas une URL, afficher le texte
      return (
        <div key={index} className="py-0.5 text-gray-700">
          {source}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des TFH</h2>
            <p className="text-gray-600 mt-1">
              Vue d'ensemble de tous les travaux de fin d'humanité par classe
            </p>
          </div>
          <div className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-medium">
            {eleves.length} TFH
          </div>
        </div>

        {/* Tableau des TFH */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Classe
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Élève
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Thématique
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Problématique
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Sources
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elevesTries.map((eleve) => (
                <tr key={eleve.id} className="hover:bg-gray-50">
                  {/* Classe */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {eleve.classe || '-'}
                    </div>
                  </td>
                  
                  {/* Élève */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNomComplet(eleve)}
                    </div>
                  </td>
                  
                  {/* Thématique */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {eleve.thematique || '-'}
                    </div>
                  </td>
                  
                  {/* Problématique */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      {eleve.problematique || '-'}
                    </div>
                  </td>
                  
                  {/* Sources */}
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      {renderSources(eleve)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {eleves.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">Aucun TFH trouvé</div>
            <p className="text-gray-500 text-sm">
              Les données des élèves apparaîtront ici une fois importées
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
            <h3 className="text-sm font-medium text-blue-800">Informations d'affichage</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Les élèves sont triés par classe puis par nom</li>
                <li>Les sources cliquables s'ouvrent dans un nouvel onglet</li>
                <li>Un tiret (-) indique une information non renseignée</li>
                <li>Cette vue est en lecture seule</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
