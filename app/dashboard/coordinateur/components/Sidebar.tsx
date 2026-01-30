'use client';

import { 
  Shield, FileText, UserCheck, Calendar, 
  Users, Settings, BarChart, LogOut,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  elevesCount: number;
  guidesCount: number;
  defensesCount: number;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  userName: string;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  elevesCount,
  guidesCount,
  defensesCount,
  isMenuOpen,
  onMenuToggle,
  userName,
  onLogout
}: SidebarProps) {
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
      count: elevesCount
    },
    {
      id: 'presences',
      name: 'Présences',
      icon: '✓',
      color: 'green',
    },
    {
      id: 'defenses' as TabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      color: 'green',
      showCount: true,
      count: defensesCount
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
      count: elevesCount + guidesCount
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
      count: guidesCount
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">TFH Portal</h2>
              <p className="text-xs text-gray-500">Coordinateur</p>
            </div>
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
                ${activeTab === tab.id 
                  ? `bg-${tab.color}-50 text-${tab.color}-700 border border-${tab.color}-200` 
                  : 'text-gray-700'
                }
              `}
            >
              <div className={`
                p-2 rounded-lg
                ${activeTab === tab.id 
                  ? `bg-${tab.color}-100 text-${tab.color}-600` 
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {tab.icon}
              </div>
              
              <div className="flex-1 text-left">
                <div className="font-medium flex items-center justify-between">
                  <span>{tab.name}</span>
                  {tab.showCount && tab.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${tab.color}-100 text-${tab.color}-700`}>
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
            <div className="text-xs text-gray-500">
              Connecté en tant que <span className="font-medium">{userName}</span>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
