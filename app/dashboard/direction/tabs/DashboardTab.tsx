// app/dashboard/direction/tabs/DashboardTab.tsx
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

  // Charger les journées et sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const journees = await getJourneesFromSupabase(supabase);
        setJournees(journees);
        const detectedSessions = detecterSessions(journees);
        setSessions(detectedSessions);
        console.log('📊 Sessions chargées:', detectedSessions);
        console.log('📊 Nombre d\'élèves:', eleves.length);
        console.log('📊 Nombre de guides:', guides.length);
      } catch (error) {
        console.error('Erreur chargement sessions:', error);
      }
    };
    
    loadSessions();
  }, [eleves, guides]);
  
  // Fonction pour trouver la prochaine session
  const getProchaineSession = () => {
    const maintenant = new Date();
    
    // Trouver la première session dont la date de fin est aujourd'hui ou dans le futur
    const prochaineSession = sessions.find(session => {
      const finSession = new Date(session.date_fin);
      finSession.setHours(23, 59, 59, 999);
      return finSession >= maintenant;
    });
    
    console.log('📊 Prochaine session trouvée:', prochaineSession);
    return prochaineSession;
  };
  
  // Calcul des statistiques globales comme les coordinateurs
  const calculateGlobalOverview = () => {
    console.log('🔍 Calcul des statistiques...');
    
    // 1. Élèves connectés - vérifier si mot_de_passe n'est pas null ou vide
    const elevesConnected = eleves.filter(e => {
      const hasPassword = e.mot_de_passe !== null && 
                         e.mot_de_passe !== undefined && 
                         e.mot_de_passe !== '';
      console.log(`Élève ${e.nom}: mot_de_passe = "${e.mot_de_passe}", hasPassword = ${hasPassword}`);
      return hasPassword;
    }).length;
    
    const elevesTotal = eleves.length;
    
    // 2. Guides connectés - même logique
    const guidesConnected = guides.filter(g => {
      const hasPassword = g.mot_de_passe !== null && 
                         g.mot_de_passe !== undefined && 
                         g.mot_de_passe !== '';
      console.log(`Guide ${g.nom}: mot_de_passe = "${g.mot_de_passe}", hasPassword = ${hasPassword}`);
      return hasPassword;
    }).length;
    
    const guidesTotal = guides.length;
    
    console.log(`📊 Résultats: ${elevesConnected}/${elevesTotal} élèves, ${guidesConnected}/${guidesTotal} guides`);
    
    // 3. Défenses / Problématiques / Thématiques
    const defensesProgrammees = eleves.filter(e => e.date_defense).length;
    const avecProblematique = eleves.filter(e => e.problematique && e.problematique.trim() !== '').length;
    const avecThematique = eleves.filter(e => e.thematique && e.thematique.trim() !== '').length;
    
    // 4. Convoqués à la prochaine session
    const getProchainesConvocations = () => {
      const prochaineSession = getProchaineSession();
      
      if (!prochaineSession) {
        return null;
      }
      
      const sessionIndex = parseInt(prochaineSession.id.split('_')[1]);
      
      const convocations = eleves.filter(e => {
        const sessionKey = `session_${sessionIndex}_convoque` as keyof Eleve;
        const valeur = e[sessionKey];
        return valeur && typeof valeur === 'string' && valeur.startsWith('Oui');
      });
      
      return {
        session: sessionIndex,
        sessionNom: prochaineSession.nom,
        count: convocations.length,
        totalSessions: sessions.length
      };
    };
    
    console.log('📊 Statistiques calculées:', {
      elevesConnected,
      elevesTotal,
      guidesConnected,
      guidesTotal,
      defensesProgrammees,
      avecProblematique,
      avecThematique,
      prochainesConvocations: getProchainesConvocations()
    });
    
    
    return {
      elevesConnected,
      elevesTotal,
      guidesConnected,
      guidesTotal,
      defensesProgrammees,
      avecProblematique,
      avecThematique,
      prochainesConvocations: getProchainesConvocations()
    };
  };
  
  const stats = calculateGlobalOverview();
  
  // Fonction pour formater le texte selon les conditions demandées
  const getDefensesText = () => {
    if (stats.defensesProgrammees > 0) {
      return `${stats.defensesProgrammees} défenses programmées / ${stats.avecProblematique} problématiques`;
    } else if (stats.avecProblematique > 0) {
      return `${stats.avecProblematique} problématiques / ${stats.avecThematique} thématiques`;
    } else {
      return `${stats.avecThematique} thématiques / ${stats.elevesTotal} élèves`;
    }
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
      description: 'Vue globale des TFH'
    },
    {
      id: 'interface-guide' as DirectionTabType,
      name: 'Interface Guide',
      icon: <Users className="w-5 h-5" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
      countColor: 'text-emerald-600',
      chevronColor: 'bg-emerald-50 text-emerald-600',
      showCount: false,
      description: 'Vue guide (pour vos élèves encadrés)'
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
      count: eleves.length,
      description: 'Gestion des évaluations comme lecteur'
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
      icon: <FileText className="w-5 h-5" />,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200',
      countColor: 'text-indigo-600',
      chevronColor: 'bg-indigo-50 text-indigo-600',
      showCount: true,
      count: eleves.length,
      description: 'Tous les TFH - Vue d\'ensemble'
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
      count: stats.prochainesConvocations?.count || 0,
      description: 'Convocations globales'
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
      description: 'Présences globales des élèves'
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
      count: stats.defensesProgrammees,
      description: 'Soutenances programmées'
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
      description: 'Analyses avancées de progression'
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
      count: guides.length,
      description: 'Suivi qualité des guides'
    }
  ];

  console.log('🔍 DEBUG Guides:', {
    total: guides.length,
    avecMotDePasse: guides.filter(g => g.mot_de_passe).length,
    avecMotDePasseNonNull: guides.filter(g => g.mot_de_passe !== null).length,
    avecMotDePasseNonVide: guides.filter(g => g.mot_de_passe && g.mot_de_passe.trim() !== '').length,
    premierGuide: guides[0] ? {
      nom: guides[0].nom,
      initiale: guides[0].initiale,
      mot_de_passe: guides[0].mot_de_passe,
      isNull: guides[0].mot_de_passe === null,
      isEmpty: guides[0].mot_de_passe === '',
      hasValue: guides[0].mot_de_passe && guides[0].mot_de_passe.trim() !== ''
    } : 'aucun guide'
  });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord Direction</h1>
        <p className="text-gray-600">
          Bienvenue {guidePrenom} {guideNom}. Voici votre panneau de gestion des TFH.
        </p>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-md">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Statut :</span> Membre de la direction - 
            Accès complet à tous les TFH.
          </p>
        </div>
      </div>

      {/* Aperçu du système - 4 cadres identiques aux coordinateurs */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-6 text-lg">Aperçu du système</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Élèves */}
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-blue-700">
                {stats.elevesConnected}/{stats.elevesTotal}
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-blue-800 mb-1">Élèves connectés</div>
            <div className="text-xs text-blue-600">
              {stats.elevesConnected === stats.elevesTotal ? (
                <span className="text-green-600 font-medium">✓ Tous connectés</span>
              ) : (
                `${Math.round((stats.elevesConnected / stats.elevesTotal) * 100)}% ont accédé au portail`
              )}
            </div>
          </div>
          
          {/* Guides */}
          <div className="p-5 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-green-700">
                {stats.guidesConnected}/{stats.guidesTotal}
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-green-800 mb-1">Guides connectés</div>
            <div className="text-xs text-green-600">
              {stats.guidesConnected === stats.guidesTotal ? (
                <span className="text-green-600 font-medium">✓ Tous connectés</span>
              ) : (
                `${Math.round((stats.guidesConnected / stats.guidesTotal) * 100)}% ont accédé au portail`
              )}
            </div>
          </div>
          
          {/* Défenses/Problématiques/Thématiques */}
          <div className="p-5 bg-purple-50 rounded-xl border border-purple-100">
            <div className="text-center mb-2">
              <div className="text-2xl md:text-3xl font-bold text-purple-700">
                {stats.defensesProgrammees > 0 ? stats.defensesProgrammees : 
                 stats.avecProblematique > 0 ? stats.avecProblematique : 
                 stats.avecThematique}
                <span className="font-normal text-purple-600 mx-1">/</span>
                {stats.defensesProgrammees > 0 ? stats.avecProblematique : 
                 stats.avecProblematique > 0 ? stats.avecThematique : 
                 stats.elevesTotal}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {stats.defensesProgrammees > 0 ? 'défenses / problématiques' : 
                 stats.avecProblematique > 0 ? 'problématiques / thématiques' : 
                 'thématiques / élèves'}
              </div>
            </div>
            <div className="text-sm font-medium text-purple-800 mb-1 text-center">
              {stats.defensesProgrammees > 0 ? 'Défenses programmées' : 
               stats.avecProblematique > 0 ? 'Problématiques définies' : 
               'Thématiques définies'}
            </div>
            <div className="text-xs text-purple-600 text-center">
              {stats.defensesProgrammees > 0 ? (
                `${Math.round((stats.defensesProgrammees / stats.elevesTotal) * 100)}% des élèves`
              ) : stats.avecProblematique > 0 ? (
                `${Math.round((stats.avecProblematique / stats.elevesTotal) * 100)}% ont une problématique`
              ) : (
                `${Math.round((stats.avecThematique / stats.elevesTotal) * 100)}% ont une thématique`
              )}
            </div>
          </div>
          
          {/* Convoqués prochaine session */}
          <div className="p-5 bg-orange-50 rounded-xl border border-orange-100">
            <div className="text-center mb-2">
              <div className="text-2xl md:text-3xl font-bold text-orange-700">
                {stats.prochainesConvocations ? `${stats.prochainesConvocations.count}` : '0'}
                <span className="font-normal text-orange-600 mx-1">/</span>
                {stats.elevesTotal}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                convoqués / élèves total
              </div>
            </div>
            <div className="text-sm font-medium text-orange-800 mb-1 text-center">
              {stats.prochainesConvocations ? 
                `${stats.prochainesConvocations.sessionNom}` : 
                'Aucune convocation à venir'}
            </div>
            <div className="text-xs text-orange-600 text-center">
              {stats.prochainesConvocations ? (
                `${Math.round((stats.prochainesConvocations.count / stats.elevesTotal) * 100)}% des élèves`
              ) : (
                'Toutes les sessions sont terminées'
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
