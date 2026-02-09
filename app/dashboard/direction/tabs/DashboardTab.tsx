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
  Users, Shield, Bell, CalendarDays,
  TrendingUp, Target, CheckCircle, AlertCircle
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
      } catch (error) {
        console.error('Erreur chargement sessions:', error);
      }
    };
    
    loadSessions();
  }, []);
  
  // Fonction pour trouver la prochaine session
  const getProchaineSession = () => {
    const maintenant = new Date();
    
    // Trouver la première session dont la date de fin est aujourd'hui ou dans le futur
    const prochaineSession = sessions.find(session => {
      const finSession = new Date(session.date_fin);
      finSession.setHours(23, 59, 59, 999);
      return finSession >= maintenant;
    });
    
    return prochaineSession;
  };
  
  // Calcul des statistiques globales comme les coordinateurs
  const calculateGlobalOverview = () => {
    // 1. Élèves connectés
    const elevesConnected = eleves.filter(e => e.mot_de_passe && e.mot_de_passe !== '').length;
    const elevesTotal = eleves.length;
    
    // 2. Guides connectés (incluant la direction)
    const guidesConnected = guides.filter(g => g.mot_de_passe && g.mot_de_passe !== '').length;
    const guidesTotal = guides.length;
    
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
    
    // 5. Présences dernière session
    const getDernieresPresences = () => {
      if (eleves.length === 0) return null;
      
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
      
      // Compter les présences totales
      let presents = 0;
      let absents = 0;
      let convoques = 0;
      
      eleves.forEach(eleve => {
        const sessionKey = `session_${sessionIndex}_convoque` as keyof Eleve;
        const convoque = eleve[sessionKey];
        
        if (convoque && typeof convoque === 'string' && convoque.startsWith('Oui')) {
          convoques++;
          
          // Vérifier la présence pour chaque journée de cette session
          let trouve = false;
          for (let jour = 1; jour <= 20; jour++) {
            const presenceKey = `journee_${jour}_present` as keyof Eleve;
            const present = eleve[presenceKey];
            
            if (present === 'Oui' || present === true) {
              presents++;
              trouve = true;
              break;
            } else if (present === 'Non' || present === false) {
              absents++;
              trouve = true;
              break;
            }
          }
          
          // Si pas de présence enregistrée mais convoqué
          if (!trouve) {
            absents++; // Considéré comme absent
          }
        }
      });
      
      return {
        sessionNom: derniereSession.nom,
        presents,
        absents,
        convoques,
        tauxPresence: convoques > 0 ? Math.round((presents / convoques) * 100) : 0
      };
    };

    // 6. État des guides
    const guidesAvecEleves = guides.filter(g => 
      eleves.some(e => e.guide_id === g.id)
    ).length;
    
    const guidesSansEleves = guidesTotal - guidesAvecEleves;
    
    // 7. État des lecteurs internes
    const lecteursInternes = guides.filter(g => 
      eleves.some(e => e.lecteur_interne_id === g.id)
    );
    
    return {
      // Global
      elevesConnected,
      elevesTotal,
      guidesConnected,
      guidesTotal,
      
      // Progression TFH
      defensesProgrammees,
      avecProblematique,
      avecThematique,
      
      // Sessions
      prochainesConvocations: getProchainesConvocations(),
      dernieresPresences: getDernieresPresences(),
      
      // Distribution
      guidesAvecEleves,
      guidesSansEleves,
      lecteursInternesCount: lecteursInternes.length
    };
  };
  
  const stats = calculateGlobalOverview();
  
  // Déterminer le statut principal à afficher
  const getPrincipalStatut = () => {
    if (stats.defensesProgrammees > 0) {
      return {
        type: 'défenses',
        count: stats.defensesProgrammees,
        label: 'Défenses programmées',
        icon: <UserCheck className="w-5 h-5" />,
        color: 'bg-green-100 text-green-800 border-green-200'
      };
    } else if (stats.avecProblematique > 0) {
      return {
        type: 'problématiques',
        count: stats.avecProblematique,
        label: 'Problématiques définies',
        icon: <Target className="w-5 h-5" />,
        color: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    } else {
      return {
        type: 'thématiques',
        count: stats.avecThematique,
        label: 'Thématiques définies',
        icon: <BookOpen className="w-5 h-5" />,
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }
  };
  
  const principalStatut = getPrincipalStatut();
  
  // Onglets spécifiques à la direction (avec vue globale)
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
      count: stats.lecteursInternesCount,
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
      count: stats.elevesTotal,
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
      icon: <CheckCircle className="w-5 h-5" />,
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
      count: stats.guidesTotal,
      description: 'Suivi qualité des guides'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord Direction - Vue Globale</h1>
        <p className="text-gray-600">
          Bienvenue {guidePrenom} {guideNom}. Vue d'ensemble de tous les TFH.
        </p>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-md">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Statut :</span> Membre de la direction - 
            Accès complet à tous les TFH et statistiques globales.
          </p>
        </div>
      </div>

      {/* Aperçu global du système - Identique aux coordinateurs */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-800 text-lg">Aperçu global du système</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${principalStatut.color}`}>
            <div className="flex items-center gap-1">
              {principalStatut.icon}
              <span>{principalStatut.label}</span>
            </div>
          </div>
        </div>
        
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
          
          {/* Progression TFH */}
          <div className="p-5 bg-purple-50 rounded-xl border border-purple-100">
            <div className="text-center mb-2">
              <div className="text-2xl md:text-3xl font-bold text-purple-700">
                {principalStatut.count}
                <span className="font-normal text-purple-600 mx-1">/</span>
                {principalStatut.type === 'défenses' ? stats.avecProblematique :
                 principalStatut.type === 'problématiques' ? stats.avecThematique :
                 stats.elevesTotal}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {principalStatut.type} / {principalStatut.type === 'défenses' ? 'problématiques' :
                principalStatut.type === 'problématiques' ? 'thématiques' : 'élèves'}
              </div>
            </div>
            <div className="text-sm font-medium text-purple-800 mb-1 text-center">
              {principalStatut.label}
            </div>
            <div className="text-xs text-purple-600 text-center">
              {principalStatut.type === 'défenses' ? (
                `${Math.round((stats.defensesProgrammees / stats.elevesTotal) * 100)}% des élèves`
              ) : principalStatut.type === 'problématiques' ? (
                `${Math.round((stats.avecProblematique / stats.elevesTotal) * 100)}% ont une problématique`
              ) : (
                `${Math.round((stats.avecThematique / stats.elevesTotal) * 100)}% ont une thématique`
              )}
            </div>
          </div>
          
          {/* Sessions */}
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
        
        {/* Deuxième ligne de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Distribution guides */}
          <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-indigo-700">
                {stats.guidesAvecEleves}/{stats.guidesTotal}
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-indigo-800 mb-1">Guides actifs</div>
            <div className="text-xs text-indigo-600">
              {stats.guidesSansEleves === 0 ? (
                <span className="text-green-600 font-medium">✓ Tous les guides ont des élèves</span>
              ) : (
                `${stats.guidesSansEleves} guide(s) sans élève assigné`
              )}
            </div>
          </div>
          
          {/* Présences dernière session */}
          <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-emerald-700">
                {stats.dernieresPresences ? 
                  `${stats.dernieresPresences.presents}/${stats.dernieresPresences.convoques}` : 
                  '0/0'}
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-emerald-800 mb-1">
              {stats.dernieresPresences ? 'Présents dernière session' : 'Données présence'}
            </div>
            <div className="text-xs text-emerald-600">
              {stats.dernieresPresences ? (
                <span>
                  {stats.dernieresPresences.sessionNom}<br/>
                  {stats.dernieresPresences.tauxPresence}% de présence
                </span>
              ) : (
                'Aucune donnée disponible'
              )}
            </div>
          </div>
          
          {/* Lecteurs internes */}
          <div className="p-5 bg-violet-50 rounded-xl border border-violet-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-violet-700">
                {stats.lecteursInternesCount}
              </div>
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-violet-800 mb-1">Lecteurs internes</div>
            <div className="text-xs text-violet-600">
              {stats.lecteursInternesCount > 0 ? (
                `${stats.lecteursInternesCount} guide(s) avec rôle lecteur`
              ) : (
                'Aucun lecteur interne assigné'
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
