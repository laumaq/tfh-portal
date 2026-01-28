'use client';

import { Eleve, Guide, TabType } from '../types';
import { 
  Shield, FileText, UserCheck, Calendar, 
  Users, Settings, BarChart, ChevronRight 
} from 'lucide-react';

interface DashboardTabProps {
  eleves: Eleve[];
  guides: Guide[];
  onTabChange: (tab: TabType) => void;
  userName: string;
}

export default function DashboardTab({ 
  eleves, 
  guides, 
  onTabChange,
  userName 
}: DashboardTabProps) {
  const tabs = [
    {
      id: 'dashboard' as TabType,
      name: 'Tableau de bord',
      icon: <Shield className="w-5 h-5" />,
      color: 'blue',
      showCount: false
    },
    {
      id: 'convocations' as TabType,
      name: 'Convocations',
      icon: <FileText className="w-5 h-5" />,
      color: 'purple',
      showCount: true,
      count: eleves.length
    },
    {
      id: 'defenses' as TabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      color: 'green',
      showCount: true,
      count: eleves.filter(e => e.date_defense).length
    },
    {
      id: 'calendrier' as TabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      color: 'orange',
      showCount: false
    },
    {
      id: 'gestion-utilisateurs' as TabType,
      name: 'Utilisateurs',
      icon: <Users className="w-5 h-5" />,
      color: 'indigo',
      showCount: true,
      count: eleves.length + guides.length
    },
    {
      id: 'parametres' as TabType,
      name: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      color: 'gray',
      showCount: false
    },
    {
      id: 'stats' as TabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      color: 'emerald',
      showCount: false
    },
    {
      id: 'controle' as TabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      color: 'red',
      showCount: true,
      count: guides.length
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord Coordinateur</h1>
        <p className="text-gray-600">Bienvenue {userName}. Gestion complète du système TFH Portal.</p>
      </div>

      {/* Cartes de navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {tabs.filter(t => t.id !== 'dashboard').map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              bg-white rounded-xl shadow-sm border p-6 cursor-pointer
              transition-all hover:shadow-md hover:-translate-y-1
              border-${tab.color}-200 hover:border-${tab.color}-300
              group
            `}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-lg bg-${tab.color}-100 text-${tab.color}-600 group-hover:bg-${tab.color}-200`}>
                {tab.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{tab.name}</h3>
                <p className="text-sm text-gray-500">
                  {tab.id === 'convocations' && 'Gestion des convocations'}
                  {tab.id === 'defenses' && 'Planification des soutenances'}
                  {tab.id === 'calendrier' && 'Planning & détection de conflits'}
                  {tab.id === 'gestion-utilisateurs' && 'Gestion des comptes utilisateurs'}
                  {tab.id === 'parametres' && 'Configuration système'}
                  {tab.id === 'stats' && 'Analyses et métriques'}
                  {tab.id === 'controle' && 'Suivi des performances des guides'}
                </p>
              </div>
              {tab.showCount && tab.count !== undefined && (
                <div className={`text-lg font-bold text-${tab.color}-600`}>
                  {tab.count}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accéder à la section</span>
                <div className={`p-1 rounded-full bg-${tab.color}-50 text-${tab.color}-600`}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Statistiques rapides */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Aperçu rapide du système</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{eleves.length}</div>
            <div className="text-sm text-blue-600">Élèves</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-green-700">{guides.length}</div>
            <div className="text-sm text-green-600">Guides</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-2xl font-bold text-purple-700">
              {eleves.filter(e => e.date_defense).length}
            </div>
            <div className="text-sm text-purple-600">Défenses programmées</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="text-2xl font-bold text-orange-700">
              {eleves.filter(e => e.convocation_mars?.startsWith('Oui')).length}
            </div>
            <div className="text-sm text-orange-600">Convoqués mars</div>
          </div>
        </div>
      </div>
    </div>
  );
}
