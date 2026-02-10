// app/dashboard/direction/tabs/DefensesTab.tsx - Version corrigée
'use client';

import { useState, useEffect } from 'react';
import { Eleve, Guide, LecteurExterne, Mediateur } from '../../coordinateur/types';
import { formatDateForInput, add50Minutes } from '../../coordinateur/utils/dateUtils';
import { getCategoryColor } from '../../coordinateur/utils/categoryUtils';

interface DefensesTabDirectionProps {
  eleves: Eleve[];
  guides: Guide[];
  lecteursExternes: LecteurExternes[];
  mediateurs: Mediateur[];
  onRefresh: () => void;
  canEdit?: (eleve: Eleve) => boolean; // Fonction pour vérifier les droits d'édition (non de visualisation)
}

export default function DefensesTabDirection({
  eleves,
  guides,
  lecteursExternes,
  mediateurs,
  onRefresh,
  canEdit
}: DefensesTabDirectionProps) {
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [userId, setUserId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all'); // <-- NOUVEAU : filtre pour voir toutes les défenses ou seulement celles où on est impliqué

  // Récupérer l'ID de l'utilisateur connecté
  useEffect(() => {
    const id = localStorage.getItem('userId');
    setUserId(id);
  }, []);

  // Synchroniser les données locales
  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  // Fonction pour vérifier si la direction EST IMPLIQUÉE avec cet élève (pour l'édition)
  const isUserInvolved = (eleve: Eleve): boolean => {
    if (!userId) return false;
    return eleve.guide_id === userId || eleve.lecteur_interne_id === userId;
  };

  // Fonction pour vérifier si la direction peut VOIR cet élève
  // La direction voit TOUS les élèves, mais peut filtrer avec le bouton
  const canAccessEleve = (eleve: Eleve): boolean => {
    if (filterMode === 'all') {
      return true; // Voir TOUS les élèves
    } else {
      return isUserInvolved(eleve); // Voir seulement les élèves impliqués
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

  // Filtrer les élèves selon le mode de filtre
  const accessibleEleves = localEleves.filter(eleve => canAccessEleve(eleve));

  // Fonction pour obtenir le rôle de la direction pour un élève
  const getRoleForEleve = (eleve: Eleve) => {
    if (!userId) return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">-</span>;
    
    if (eleve.guide_id === userId && eleve.lecteur_interne_id === userId) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Guide & Lecteur</span>;
    } else if (eleve.guide_id === userId) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Guide</span>;
    } else if (eleve.lecteur_interne_id === userId) {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Lecteur interne</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">-</span>;
  };

  // Calculer les statistiques
  const calculateStats = () => {
    const totalAll = localEleves.length; // Total de tous les élèves
    const totalAccessible = accessibleEleves.length;
    const withDateDefense = accessibleEleves.filter(e => e.date_defense).length;
    const withCompleteJury = accessibleEleves.filter(e => 
      e.guide_id && e.lecteur_interne_id && e.lecteur_externe_id
    ).length;
    const withMediateur = accessibleEleves.filter(e => e.mediateur_id).length;

    return {
      totalAll, // Total de tous les élèves
      totalAccessible, // Total selon le filtre actuel
      withDateDefense,
      withCompleteJury,
      withMediateur,
      percentageWithDate: totalAccessible > 0 ? Math.round((withDateDefense / totalAccessible) * 100) : 0,
      percentageWithJury: totalAccessible > 0 ? Math.round((withCompleteJury / totalAccessible) * 100) : 0,
      percentageWithMediateur: totalAccessible > 0 ? Math.round((withMediateur / totalAccessible) * 100) : 0,
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Boutons de filtre */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterMode === 'all'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                👁️ Toutes les défenses
              </button>
              <button
                onClick={() => setFilterMode('mine')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterMode === 'mine'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🎯 Mes défenses
              </button>
            </div>
            
            {/* Note sur les droits d'accès */}
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                📋 Visualisation seule - Pas de droits d'édition
              </span>
            </div>
          </div>
          
          <span className="text-sm text-gray-500">
            {filterMode === 'all' 
              ? `(${stats.totalAccessible} élève${stats.totalAccessible > 1 ? 's' : ''} au total)`
              : `(${stats.totalAccessible} élève${stats.totalAccessible > 1 ? 's' : ''} sous ma responsabilité)`
            }
          </span>
        </div>
        
        {/* Statistiques */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{stats.totalAccessible}</div>
              <div className="text-sm text-gray-600">
                {filterMode === 'all' ? 'TFH total' : 'Mes TFH'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {stats.withDateDefense} ({stats.percentageWithDate}%)
              </div>
              <div className="text-sm text-gray-600">Date définie</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {stats.withCompleteJury} ({stats.percentageWithJury}%)
              </div>
              <div className="text-sm text-gray-600">Jury complet</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {stats.withMediateur} ({stats.percentageWithMediateur}%)
              </div>
              <div className="text-sm text-gray-600">Avec médiateur</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {filterMode === 'all' ? localEleves.length - stats.totalAccessible : stats.totalAccessible}
              </div>
              <div className="text-sm text-gray-600">
                {filterMode === 'all' ? 'TFH non-accessibles' : 'TFH accessibles'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des défenses */}
      {accessibleEleves.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {filterMode === 'all' 
              ? 'Aucun TFH trouvé' 
              : 'Aucun TFH sous votre responsabilité'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {filterMode === 'all' 
              ? 'Aucun TFH n\'a été trouvé dans le système.' 
              : 'Vous n\'êtes pas impliqué en tant que guide ou lecteur interne pour aucun TFH.'}
          </p>
          {filterMode === 'mine' && (
            <button
              onClick={() => setFilterMode('all')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Voir toutes les défenses
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="min-w-[1400px] md:min-w-full">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Rôle</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Nom</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prénom</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Classe</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Catégorie</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Problématique</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Guide</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Lecteur Interne</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Lecteur Externe</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Médiateur</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Date Défense</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Heure Défense</th>
                  <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Localisation</th>
                </tr>
              </thead>
              <tbody>
                {accessibleEleves.map((eleve) => {
                  const categoryStyle = getCategoryStyle(eleve.categorie || 'Non catégorisé');
                  
                  // Calculer l'heure de fin (début + 50 minutes)
                  const startTime = eleve.heure_defense;
                  const endTime = startTime ? add50Minutes(startTime) : null;
                  
                  return (
                    <tr key={eleve.id} className="border-b hover:bg-gray-50">
                      {/* Rôle */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {getRoleForEleve(eleve)}
                      </td>
                      
                      {/* Nom */}
                      <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">
                        {eleve.nom}
                      </td>
                      
                      {/* Prénom */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.prenom}
                      </td>
                      
                      {/* Classe */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.classe}
                      </td>
                      
                      {/* Catégorie */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                          style={categoryStyle}
                        >
                          {eleve.categorie || '-'}
                        </span>
                      </td>
                      
                      {/* Problématique */}
                      <td className="px-3 py-3 text-xs md:text-sm">
                        <div className="whitespace-pre-wrap break-words max-w-xs">
                          {eleve.problematique || '-'}
                        </div>
                      </td>
                      
                      {/* Guide */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {eleve.guide_nom} {eleve.guide_prenom}.
                        </div>
                      </td>  
                      
                      {/* Lecteur Interne */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {eleve.lecteur_interne_nom} {eleve.lecteur_interne_prenom}.
                        </div>
                      </td>
                      
                      {/* Lecteur Externe */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {eleve.lecteur_externe_nom ? `${eleve.lecteur_externe_nom} ${eleve.lecteur_externe_prenom}` : '-'}
                        </div>
                      </td>
                      
                      {/* Médiateur */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {eleve.mediateur_nom ? `${eleve.mediateur_nom} ${eleve.mediateur_prenom}` : '-'}
                        </div>
                      </td>   
                                                  
                      {/* Date Défense */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.date_defense ? (
                          <span className="font-medium">
                            {new Date(eleve.date_defense).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Non définie</span>
                        )}
                      </td>
                                                  
                      {/* Heure Défense */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.heure_defense ? (
                          <div className="font-medium">
                            {eleve.heure_defense}
                            {endTime && (
                              <div className="text-xs text-gray-500">
                                → {endTime}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Non définie</span>
                        )}
                      </td>
                                                  
                      {/* Localisation */}
                      <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                        {eleve.localisation_defense ? (
                          <span className="font-medium">
                            {eleve.localisation_defense}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Non définie</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Légende et informations */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Informations :</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Guide</span> : Vous êtes le guide de cet élève</li>
          <li>• <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">Lecteur interne</span> : Vous êtes lecteur interne pour cet élève</li>
          <li>• <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Guide & Lecteur</span> : Vous êtes guide ET lecteur interne</li>
          <li>• Les heures de défense incluent automatiquement +50 minutes pour la durée</li>
          <li>• Utilisez les boutons en haut pour filtrer entre toutes les défenses et vos défenses</li>
          <li>• Pour modifier les données, contactez un coordinateur</li>
        </ul>
      </div>

      {/* Note sur les droits */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Droits d'accès :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Mode <strong>"Toutes les défenses"</strong> : Vous voyez tous les TFH du système</li>
              <li>Mode <strong>"Mes défenses"</strong> : Vous ne voyez que les TFH où vous êtes impliqué</li>
              <li>Toutes les données sont en lecture seule pour la direction</li>
              <li>Pour modifier les dates, heures ou membres du jury, contactez un coordinateur</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
