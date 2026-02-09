// app/dashboard/direction/components/Sidebar.tsx
'use client';

import { 
  Shield, FileText, UserCheck, Calendar, 
  Users, Settings, BarChart, LogOut,
  Menu, X, BookOpen, User, Clock, Eye
} from 'lucide-react';
import { DirectionTabType } from '../types';

interface SidebarProps {
  activeTab: DirectionTabType;
  onTabChange: (tab: DirectionTabType) => void;
  elevesCount: number;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  userName: string;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  elevesCount,
  isMenuOpen,
  onMenuToggle,
  userName,
  onLogout
}: SidebarProps) {
  // Définition des onglets pour la direction avec couleurs spécifiques
  const tabs = [
    {
      id: 'dashboard' as DirectionTabType,
      name: 'Tableau de bord',
      icon: <Shield className="w-5 h-5" />,
      // Bleu pour le dashboard
      activeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      iconClass: 'bg-blue-100 text-blue-600',
      countClass: 'bg-blue-100 text-blue-700',
      showCount: false
    },
    {
      id: 'interface-guide' as DirectionTabType,
      name: 'Interface Guide',
      icon: <User className="w-5 h-5" />,
      // Vert pour interface guide (comme guide normal)
      activeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      iconClass: 'bg-emerald-100 text-emerald-600',
      countClass: 'bg-emerald-100 text-emerald-700',
      showCount: false
    },
    {
      id: 'lecteur-interne' as DirectionTabType,
      name: 'Lecteur Interne',
      icon: <Eye className="w-5 h-5" />,
      // Violet spécifique pour lecteur interne
      activeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
      iconClass: 'bg-violet-100 text-violet-600',
      countClass: 'bg-violet-100 text-violet-700',
      showCount: true,
      count: elevesCount
    },
    {
      id: 'planning-personnel' as DirectionTabType,
      name: 'Planning Personnel',
      icon: <Clock className="w-5 h-5" />,
      // Orange pour planning
      activeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
      iconClass: 'bg-orange-100 text-orange-600',
      countClass: 'bg-orange-100 text-orange-700',
      showCount: false
    },
    {
      id: 'liste-tfh' as DirectionTabType,
      name: 'Liste des TFH',
      icon: <BookOpen className="w-5 h-5" />,
      // Indigo pour liste
      activeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      iconClass: 'bg-indigo-100 text-indigo-600',
      countClass: 'bg-indigo-100 text-indigo-700',
      showCount: true,
      count: elevesCount
    },
    {
      id: 'convocations' as DirectionTabType,
      name: 'Convocations',
      icon: <FileText className="w-5 h-5" />,
      // Pourpre pour convocations
      activeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
      iconClass: 'bg-purple-100 text-purple-600',
      countClass: 'bg-purple-100 text-purple-700',
      showCount: true,
      count: elevesCount
    },
    {
      id: 'presences' as DirectionTabType,
      name: 'Présences',
      icon: <span className="font-bold">✓</span>,
      // Fuchsia pour présences
      activeClass: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
      iconClass: 'bg-fuchsia-100 text-fuchsia-600',
      countClass: 'bg-fuchsia-100 text-fuchsia-700',
      showCount: false
    },
    {
      id: 'defenses' as DirectionTabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      // Vert pour défenses
      activeClass: 'bg-green-50 text-green-700 border border-green-200',
      iconClass: 'bg-green-100 text-green-600',
      countClass: 'bg-green-100 text-green-700',
      showCount: true,
      count: elevesCount
    },
    {
      id: 'calendrier' as DirectionTabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      // Orange pour calendrier
      activeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      iconClass: 'bg-amber-100 text-amber-600',
      countClass: 'bg-amber-100 text-amber-700',
      showCount: false
    },
    {
      id: 'stats' as DirectionTabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      // Émeraude pour stats
      activeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      iconClass: 'bg-emerald-100 text-emerald-600',
      countClass: 'bg-emerald-100 text-emerald-700',
      showCount: false
    },
    {
      id: 'controle' as DirectionTabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      // Rouge pour contrôle
      activeClass: 'bg-red-50 text-red-700 border border-red-200',
      iconClass: 'bg-red-100 text-red-600',
      countClass: 'bg-red-100 text-red-700',
      showCount: false
    }
  ];

  return (
    <>
      {/* Overlay mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onMenuToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative top-0 left-0 h-screen
        bg-white border-r border-gray-200
        z-40 transition-all duration-300 ease-in-out
        w-64
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        {/* En-tête */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-semibold">D</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Portail TFH</h2>
              <p className="text-xs text-gray-500">Direction</p>
            </div>
          </div>
          <div className="text-xs text-gray-600 truncate">
            {userName}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
                onMenuToggle();
              }}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-all
                hover:bg-gray-50
                ${activeTab === tab.id ? tab.activeClass : 'text-gray-700'}
              `}
            >
              <div className={`
                p-2 rounded-lg
                ${activeTab === tab.id ? tab.iconClass : 'bg-gray-100 text-gray-600'}
              `}>
                {tab.icon}
              </div>
              
              <div className="flex-1 text-left">
                <div className="font-medium flex items-center justify-between">
                  <span>{tab.name}</span>
                  {tab.showCount && tab.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab.id ? tab.countClass : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Pied de page */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-3">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 p-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
            <div className="text-xs text-gray-500 text-center">
              Interface Direction
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
