'use client';

import { Eleve, Guide, TabType } from '../types';
import { 
  Shield, FileText, UserCheck, Calendar, 
  Users, Settings, BarChart, ChevronRight, BookOpen 
} from 'lucide-react';

interface DashboardTabProps {
  eleves: Eleve[];
  guides: Guide[];
  onTabChange: (tab: TabType) => void;
  userName: string;
  coordinateurNom: string; 
  coordinateurPrenom: string;
}

export default function DashboardTab({ 
  eleves, 
  guides, 
  onTabChange,
  userName,
  coordinateurNom,
  coordinateurPrenom 
}: DashboardTabProps) {
  const tabs = [
    {
      id: 'liste-tfh' as TabType,
      name: 'Liste des TFH',
      icon: <BookOpen className="w-5 h-5" />, // Assurez-vous d'importer BookOpen
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200 hover:border-violet-300',
      iconBg: 'bg-violet-100 text-violet-600 group-hover:bg-violet-200',
      countColor: 'text-violet-600',
      chevronColor: 'bg-violet-50 text-violet-600',
      showCount: true,
      count: eleves.length,
      description: 'Vue complète des travaux par classe'
    },
    {
      id: 'convocations' as TabType,
      name: 'Convocations',
      icon: <FileText className="w-5 h-5" />,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200 hover:border-purple-300',
      iconBg: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
      countColor: 'text-purple-600',
      chevronColor: 'bg-purple-50 text-purple-600',
      showCount: true,
      count: eleves.length,
      description: 'Gestion des convocations'
    },
    {
      id: 'presences' as TabType,
      name: 'Présences',
      icon: <span className="font-bold">✓</span>,
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200 hover:border-fuchsia-300',
      iconBg: 'bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200',
      countColor: 'text-fuchsia-600',
      chevronColor: 'bg-fuchsia-50 text-fuchsia-600',
      showCount: false,
      description: 'Suivi des présences/absences'
    },
    {
      id: 'defenses' as TabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200 hover:border-green-300',
      iconBg: 'bg-green-100 text-green-600 group-hover:bg-green-200',
      countColor: 'text-green-600',
      chevronColor: 'bg-green-50 text-green-600',
      showCount: true,
      count: eleves.filter(e => e.date_defense).length,
      description: 'Planification des soutenances'
    },
    {
      id: 'calendrier' as TabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200 hover:border-orange-300',
      iconBg: 'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
      countColor: 'text-orange-600',
      chevronColor: 'bg-orange-50 text-orange-600',
      showCount: false,
      description: 'Planning & détection de conflits'
    },
    {
      id: 'gestion-utilisateurs' as TabType,
      name: 'Utilisateurs',
      icon: <Users className="w-5 h-5" />,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200',
      countColor: 'text-indigo-600',
      chevronColor: 'bg-indigo-50 text-indigo-600',
      showCount: true,
      count: eleves.length + guides.length,
      description: 'Gestion des comptes utilisateurs'
    },
    {
      id: 'parametres' as TabType,
      name: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200 hover:border-sky-300',
      iconBg: 'bg-sky-100 text-sky-600 group-hover:bg-sky-200',
      countColor: 'text-sky-600',
      chevronColor: 'bg-sky-50 text-sky-600',
      showCount: false,
      description: 'Configuration système'
    },
    {
      id: 'stats' as TabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
      countColor: 'text-emerald-600',
      chevronColor: 'bg-emerald-50 text-emerald-600',
      showCount: false,
      description: 'Analyses et métriques'
    },
    {
      id: 'controle' as TabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200 hover:border-red-300',
      iconBg: 'bg-red-100 text-red-600 group-hover:bg-red-200',
      countColor: 'text-red-600',
      chevronColor: 'bg-red-50 text-red-600',
      showCount: true,
      count: guides.length,
      description: 'Suivi des performances des guides'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tableau de bord Coordinateur</h1>
        <p className="text-gray-600">Bienvenue {coordinateurPrenom} {coordinateurNom}. Voici votre panneau de gestion des TFH.</p>
      </div>

      {/* Cartes de navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {tabs.map((tab) => (
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
