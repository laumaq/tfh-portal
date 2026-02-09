// app/dashboard/coordinateur/tabs/DashboardTabDirection.tsx
'use client';

import { Eleve, Guide } from '../types'; 
import { DirectionTabType } from '../types';
import { detecterSessions, Journee, getJourneesFromSupabase } from '../../coordinateur/utils/sessionUtils';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { 
  FileText, UserCheck, Calendar, 
  BarChart, ChevronRight, BookOpen,
  Users, Shield, Bell, CalendarDays
} from 'lucide-react';

interface DashboardTabProps {
  eleves: Eleve[];
  guides: Guide[];
  onTabChange: (tab: DirectionTabType) => void;  
  userName: string;
  guideNom: string; 
  guidePrenom: string;
}

export default function DashboardTabDirection({ 
  eleves, 
  guides, 
  onTabChange,
  userName,
  guideNom,
  guidePrenom 
}: DashboardTabProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [journees, setJournees] = useState<Journee[]>([]);
  const [elevesAsGuide, setElevesAsGuide] = useState<Eleve[]>([]);
  const [elevesAsLecteur, setElevesAsLecteur] = useState<Eleve[]>([]);

  // Charger les journées et sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const journees = await getJourneesFromSupabase(supabase);
        setJournees(journees);
        const detectedSessions = detecterSessions(journees);
        setSessions(detectedSessions);
      } catch (error) {
        console.error('Erreur chargement sessions:', error);
      }
    };
    
    loadSessions();
  }, []);

  // Séparer les élèves selon le rôle de la direction
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const elevesGuide = eleves.filter(e => e.guide_id === userId);
    const elevesLecteur = eleves.filter(e => e.lecteur_interne_id === userId);
    
    setElevesAsGuide(elevesGuide);
    setElevesAsLecteur(elevesLecteur);
  }, [eleves]);

  // Fonction pour trouver la prochaine session
  const getProchaineSession = () => {
    const maintenant = new Date();
    
    const prochaineSession = sessions.find(session => {
      const finSession = new Date(session.date_fin);
      finSession.setHours(23, 59, 59, 999);
      return finSession >= maintenant;
    });
    
    return prochaineSession;
  };
  
  // Calcul des statistiques personnalisées pour la direction
  const calculateDirectionOverview = () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return null;

    // 1. Élèves encadrés comme GUIDE
    const mesEleves = eleves.filter(e => e.guide_id === userId);
    const mesElevesWithProblematique = mesEleves.filter(e => e.problematique?.trim()).length;
    const mesElevesWithThematique = mesEleves.filter(e => e.thematique?.trim()).length;
    const mesDefensesProgrammees = mesEleves.filter(e => e.date_defense).length;

    // 2. Élèves évalués comme LECTEUR INTERNE
    const mesEvaluations = eleves.filter(e => e.lecteur_interne_id === userId);
    const evaluationsAvecProblematique = mesEvaluations.filter(e => e.problematique?.trim()).length;

    // 3. Convocations pour la prochaine session (élèves dont je suis guide)
    const getMesConvocations = () => {
      const prochaineSession = getProchaineSession();
      if (!prochaineSession || mesEleves.length === 0) {
        return null;
      }
      
      const sessionIndex = parseInt(prochaineSession.id.split('_')[1]);
      const mesConvocations = mesEleves.filter(e => {
        const sessionKey = `session_${sessionIndex}_convoque` as keyof Eleve;
        const valeur = e[sessionKey];
        return valeur && typeof valeur === 'string' && valeur.startsWith('Oui');
      });
      
      return {
        session: sessionIndex,
        sessionNom: prochaineSession.nom,
        count: mesConvocations.length,
        total: mesEleves.length
      };
    };

    // 4. Présences à la dernière session
    const getMesPresences = () => {
      if (mesEleves.length === 0) return null;
      
      // Trouver la dernière session passée
      const maintenant = new Date();
      const sessionsPassees = sessions.filter(s => {
        const finSession = new Date(s.date_fin);
        finSession.setHours(23, 59, 59, 999);
        return finSession < maintenant;
      });
      
      if (sessionsPassees.length === 0) return null;
      
      const derniereSession = sessionsPassees[sessionsPassees.length - 1];
      const sessionIndex = parseInt(derniereSession.id.split('_')[1]);
      
      // Compter les présences
      let presents = 0;
      let absents = 0;
      
      mesEleves.forEach(eleve => {
        const sessionKey = `session_${sessionIndex}_convoque` as keyof Eleve;
        const convoque = eleve[sessionKey];
        
        if (convoque && typeof convoque === 'string' && convoque.startsWith('Oui')) {
          // Vérifier la présence pour chaque journée de cette session
          for (let jour = 1; jour <= 20; jour++) {
            const presenceKey = `journee_${jour}_present` as keyof Eleve;
            const present = eleve[presenceKey];
            
            if (present === 'Oui' || present === true) {
              presents++;
              break;
            } else if (present === 'Non' || present === false) {
              absents++;
              break;
            }
          }
        }
      });
      
      return {
        sessionNom: derniereSession.nom,
        presents,
        absents,
        total: presents + absents
      };
    };

    return {
      // Encadrement
      mesElevesCount: mesEleves.length,
      mesElevesProblematiques: mesElevesWithProblematique,
      mesElevesThematiques: mesElevesWithThematique,
      mesDefenses: mesDefensesProgrammees,
      
      // Évaluations
      evaluationsCount: mesEvaluations.length,
      evaluationsProblematiques: evaluationsAvecProblematique,
      
      // Sessions
      mesConvocations: getMesConvocations(),
      mesPresences: getMesPresences(),
      
      // Totaux
      totalEleves: mesEleves.length + mesEvaluations.length
    };
  };
  
  const stats = calculateDirectionOverview() || {
    mesElevesCount: 0,
    mesElevesProblematiques: 0,
    mesElevesThematiques: 0,
    mesDefenses: 0,
    evaluationsCount: 0,
    evaluationsProblematiques: 0,
    mesConvocations: null,
    mesPresences: null,
    totalEleves: 0
  };
  
  // Onglets spécifiques à la direction
  const directionTabs = [
    {
      id: 'dashboard' as DirectionTabType,
      name: 'Tableau de bord',
      icon: <CalendarDays className="w-5 h-5" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200 hover:border-blue-300',
      iconBg: 'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
      countColor: 'text-blue-600',
      chevronColor: 'bg-blue-50 text-blue-600',
      showCount: false,
      description: 'Vue générale de vos responsabilités'
    },
    {
      id: 'lecteur-interne' as DirectionTabType,
      name: 'Lecteur interne',
      icon: <BookOpen className="w-5 h-5" />,
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200 hover:border-violet-300',
      iconBg: 'bg-violet-100 text-violet-600 group-hover:bg-violet-200',
      countColor: 'text-violet-600',
      chevronColor: 'bg-violet-50 text-violet-600',
      showCount: true,
      count: stats.evaluationsCount,
      description: 'TFH à évaluer comme lecteur'
    },
    {
      id: 'planning-personnel' as DirectionTabType,
      name: 'Planning personnel',
      icon: <Calendar className="w-5 h-5" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200 hover:border-orange-300',
      iconBg: 'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
      countColor: 'text-orange-600',
      chevronColor: 'bg-orange-50 text-orange-600',
      showCount: false,
      description: 'Votre agenda et disponibilités'
    },
    {
      id: 'liste-tfh' as DirectionTabType,
      name: 'Liste des TFH',
      icon: <Users className="w-5 h-5" />,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200',
      countColor: 'text-indigo-600',
      chevronColor: 'bg-indigo-50 text-indigo-600',
      showCount: true,
      count: stats.totalEleves,
      description: 'Tous les TFH sous votre responsabilité'
    },
    {
      id: 'convocations' as DirectionTabType,
      name: 'Convocations',
      icon: <Bell className="w-5 h-5" />,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200 hover:border-purple-300',
      iconBg: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
      countColor: 'text-purple-600',
      chevronColor: 'bg-purple-50 text-purple-600',
      showCount: true,
      count: stats.mesConvocations?.count || 0,
      description: 'Convocations de vos élèves'
    },
    {
      id: 'presences' as DirectionTabType,
      name: 'Présences',
      icon: <span className="font-bold">✓</span>,
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200 hover:border-fuchsia-300',
      iconBg: 'bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200',
      countColor: 'text-fuchsia-600',
      chevronColor: 'bg-fuchsia-50 text-fuchsia-600',
      showCount: false,
      description: 'Présences/absences de vos élèves'
    },
    {
      id: 'defenses' as DirectionTabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200 hover:border-green-300',
      iconBg: 'bg-green-100 text-green-600 group-hover:bg-green-200',
      countColor: 'text-green-600',
      chevronColor: 'bg-green-50 text-green-600',
      showCount: true,
      count: stats.mesDefenses,
      description: 'Soutenances de vos élèves'
    },
    {
      id: 'calendrier' as DirectionTabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200 hover:border-amber-300',
      iconBg: 'bg-amber-100 text-amber-600 group-hover:bg-amber-200',
      countColor: 'text-amber-600',
      chevronColor: 'bg-amber-50 text-amber-600',
      showCount: false,
      description: 'Planning global des TFH'
    },
    {
      id: 'stats' as DirectionTabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
      countColor: 'text-emerald-600',
      chevronColor: 'bg-emerald-50 text-emerald-600',
      showCount: false,
      description: 'Analyses de progression'
    },
    {
      id: 'controle' as DirectionTabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200 hover:border-red-300',
      iconBg: 'bg-red-100 text-red-600 group-hover:bg-red-200',
      countColor: 'text-red-600',
      chevronColor: 'bg-red-50 text-red-600',
      showCount: true,
      count: stats.mesElevesCount + stats.evaluationsCount,
      description: 'Suivi qualité des TFH'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord - Direction</h1>
        <p className="text-gray-600">
          Bienvenue {guidePrenom} {guideNom}. Vue d'ensemble de vos responsabilités TFH.
        </p>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-md">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Statut :</span> Membre de la direction - 
            Vous avez accès aux fonctionnalités guide + droits étendus.
          </p>
        </div>
      </div>

      {/* Aperçu personnel des responsabilités */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-6 text-lg">Vos responsabilités TFH</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Encadrement en tant que GUIDE */}
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-blue-700">
                {stats.mesElevesCount}
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-blue-800 mb-1">Élèves encadrés</div>
            <div className="text-xs text-blue-600 space-y-1">
              <div>• {stats.mesElevesProblematiques} avec problématique</div>
              <div>• {stats.mesElevesThematiques} avec thématique</div>
              <div>• {stats.mesDefenses} défenses programmées</div>
            </div>
          </div>
          
          {/* Évaluations en tant que LECTEUR INTERNE */}
          <div className="p-5 bg-violet-50 rounded-xl border border-violet-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-violet-700">
                {stats.evaluationsCount}
              </div>
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-violet-800 mb-1">TFH à évaluer</div>
            <div className="text-xs text-violet-600">
              {stats.evaluationsCount > 0 ? (
                <span>
                  {stats.evaluationsProblematiques} avec problématique définie
                  <br />
                  {stats.evaluationsCount - stats.evaluationsProblematiques} en attente
                </span>
              ) : (
                "Aucune évaluation assignée"
              )}
            </div>
          </div>
          
          {/* Convocations prochaine session */}
          <div className="p-5 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-purple-700">
                {stats.mesConvocations ? `${stats.mesConvocations.count}/${stats.mesConvocations.total}` : '0'}
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-purple-800 mb-1">
              {stats.mesConvocations ? 'Convoqués prochaine session' : 'Aucune convocation'}
            </div>
            <div className="text-xs text-purple-600">
              {stats.mesConvocations ? (
                <span>
                  {stats.mesConvocations.sessionNom}
                  <br />
                  {stats.mesConvocations.count > 0 ? 
                    `${Math.round((stats.mesConvocations.count / stats.mesConvocations.total) * 100)}% de vos élèves` :
                    "Aucun élève convoqué"
                  }
                </span>
              ) : (
                "Toutes les sessions sont terminées"
              )}
            </div>
          </div>
          
          {/* Présences dernière session */}
          <div className="p-5 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-green-700">
                {stats.mesPresences ? `${stats.mesPresences.presents}/${stats.mesPresences.total}` : '0'}
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-green-600">✓</span>
              </div>
            </div>
            <div className="text-sm font-medium text-green-800 mb-1">
              {stats.mesPresences ? 'Présents dernière session' : 'Aucune donnée'}
            </div>
            <div className="text-xs text-green-600">
              {stats.mesPresences ? (
                <span>
                  {stats.mesPresences.sessionNom}
                  <br />
                  {stats.mesPresences.absents} absence(s) constatée(s)
                </span>
              ) : (
                "Données de présence non disponibles"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cartes de navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {directionTabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              bg-white rounded-xl shadow-sm border p-6 cursor-pointer
              transition-all hover:shadow-md hover:-translate-y-1
              ${tab.borderColor}
              group
            `}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-lg ${tab.iconBg}`}>
                {tab.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{tab.name}</h3>
                <p className="text-sm text-gray-500">{tab.description}</p>
              </div>
              {tab.showCount && tab.count !== undefined && (
                <div className={`text-lg font-bold ${tab.countColor}`}>
                  {tab.count}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accéder à la section</span>
                <div className={`p-1 rounded-full ${tab.chevronColor}`}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
