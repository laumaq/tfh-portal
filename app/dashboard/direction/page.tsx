// app/dashboard/direction/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import LoadingSpinner from '../coordinateur/components/LoadingSpinner';
import DashboardTab from './tabs/DashboardTab';
import ListeTFHTab from './tabs/ListeTFHTab';
import ConvocationsTab from './tabs/ConvocationsTab';
import PresencesTab from './tabs/PresencesTab';
import DefensesTab from './tabs/DefensesTab';
import CalendrierTab from './tabs/CalendrierTab';
import StatsTab from './tabs/StatsTab';
import ControleTab from './tabs/ControleTab';
import LecteurInterneTab from './tabs/LecteurInterneTab';
import PlanningPersonnelTab from './tabs/PlanningPersonnelTab';
import { useDirectionData } from './hooks/useDirectionData';
import { useElevesOperations } from '../coordinateur/hooks/useElevesOperations';
import { TabType } from '../coordinateur/types';

export default function DirectionDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [editingModeConvocations, setEditingModeConvocations] = useState(false);
  const [editingModeDefenses, setEditingModeDefenses] = useState(false);

  // Utiliser les hooks custom (nous créerons useDirectionData ensuite)
  const { 
    eleves, 
    guides, 
    lecteursExternes, 
    mediateurs, 
    categories,
    currentGuide,
    loading, 
    refreshData 
  } = useDirectionData();
  
  const {
    editingCell,
    setEditingCell,
    handleUpdate,
    handleSelectUpdate,
    handlePresenceUpdate
  } = useElevesOperations();

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const name = localStorage.getItem('userName');
    
    if (userType !== 'direction') {
      router.push('/');
      return;
    }
    
    setUserName(name || '');
  }, [router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab 
            eleves={eleves}
            guides={guides}
            onTabChange={setActiveTab}
            userName={userName}
            coordinateurNom={currentGuide?.nom || ''}
            coordinateurPrenom={currentGuide?.initiale || ''}
          />
        );

      case 'interface-guide':
        return (
          <InterfaceGuideTab
            guideId={currentGuide?.id || ''}
            onRefresh={refreshData}
          />
        );
      
      case 'lecteur-interne':
        return (
          <LecteurInterneTab
            eleves={eleves.filter(e => e.lecteur_interne_id === currentGuide?.id)}
            guideId={currentGuide?.id || ''}
            onRefresh={refreshData}
          />
        );
      
      case 'planning-personnel':
        return (
          <PlanningPersonnelTab
            guideId={currentGuide?.id || ''}
            eleves={eleves}
          />
        );
        
      case 'liste-tfh':
        return (
          <ListeTFHTab
            eleves={eleves}
            onRefresh={refreshData}
            onUpdate={handleUpdate}
          />
        );
            
      case 'convocations':
        return (
          <ConvocationsTab
            eleves={eleves}
            guides={guides}
            editingMode={editingModeConvocations}
            editingCell={editingCell}
            onUpdate={handleUpdate}
            onSelectUpdate={handleSelectUpdate}
            onRefresh={refreshData}
            onSetEditingCell={setEditingCell}
            onSetEditingMode={setEditingModeConvocations}
            // Restreindre l'édition aux TFH où la direction est guide ou lecteur interne
            canEdit={(eleve) => 
              eleve.guide_id === currentGuide?.id || 
              eleve.lecteur_interne_id === currentGuide?.id
            }
          />
        );

      case 'presences':
        return (
          <PresencesTab
            eleves={eleves}
            editingMode={editingModeConvocations}
            onSetEditingMode={setEditingModeConvocations}
            onPresenceUpdate={handlePresenceUpdate}
            onRefresh={refreshData}
            // Restreindre l'édition aux TFH où la direction est guide ou lecteur interne
            canEdit={(eleve) => 
              eleve.guide_id === currentGuide?.id || 
              eleve.lecteur_interne_id === currentGuide?.id
            }
          />
        );

      case 'defenses': 
        return (
          <DefensesTab
            eleves={eleves}
            guides={guides}
            lecteursExternes={lecteursExternes}
            mediateurs={mediateurs}
            editingMode={editingModeDefenses}
            onUpdate={handleUpdate}
            onSelectUpdate={handleSelectUpdate}
            onRefresh={refreshData}
            onSetEditingMode={setEditingModeDefenses}
            // Restreindre l'édition aux TFH où la direction est guide ou lecteur interne
            canEdit={(eleve) => 
              eleve.guide_id === currentGuide?.id || 
              eleve.lecteur_interne_id === currentGuide?.id
            }
          />
        );

      case 'calendrier':
        return (
          <CalendrierTab
            eleves={eleves}
            categories={categories}
            onRefresh={refreshData}
            // Optionnel : filtrer pour voir seulement les TFH pertinents
            filterByGuideId={currentGuide?.id}
          />
        );

      case 'stats':
        return (
          <StatsTab
            eleves={eleves}
            guides={guides}
          />
        );

      case 'controle':
        return (
          <ControleTab
            eleves={eleves}
            guides={guides}
            // Limiter aux conflits concernant les TFH de la direction
            filterByGuideId={currentGuide?.id}
          />
        );
        
      default:
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Onglet non disponible pour la direction
            </h2>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retour au tableau de bord
            </button>
          </div>
        );
    }
  };

  // Définir les onglets disponibles pour la direction
  const directionTabs: TabType[] = [
    'dashboard',
    'interface-guide', 
    'lecteur-interne',
    'planning-personnel',
    'liste-tfh',
    'convocations',
    'presences',
    'defenses',
    'calendrier',
    'stats',
    'controle'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar modifiée pour la direction */}
        <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold">D</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Direction</h2>
                <p className="text-xs text-gray-500 truncate">{userName}</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {directionTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center space-x-3 ${
                  activeTab === tab 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium capitalize">
                  {tab === 'dashboard' ? 'Tableau de bord' :
                   tab === 'liste-tfh' ? 'Liste des TFH' :
                   tab === 'lecteur-interne' ? 'Lecteur interne' :
                   tab === 'planning-personnel' ? 'Planning personnel' :
                   tab.replace('-', ' ')}
                </span>
              </button>
            ))}
            
            <button
              onClick={() => {
                localStorage.clear();
                router.push('/');
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center space-x-3 mt-8"
            >
              <span className="font-medium">Déconnexion</span>
            </button>
          </nav>
        </div>
        
        {/* Contenu principal */}
        <main className="flex-1 overflow-auto">
          {/* En-tête mobile */}
          <header className="md:hidden p-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 className="font-semibold text-gray-800">
                  {activeTab === 'dashboard' ? 'Tableau de bord' : 
                   activeTab === 'lecteur-interne' ? 'Lecteur interne' :
                   activeTab === 'planning-personnel' ? 'Planning personnel' :
                   activeTab === 'liste-tfh' ? 'Liste des TFH' :
                   activeTab === 'convocations' ? 'Convocations' : 
                   activeTab === 'presences' ? 'Présences' : 
                   activeTab === 'defenses' ? 'Défenses' : 
                   activeTab === 'calendrier' ? 'Calendrier' : 
                   activeTab === 'stats' ? 'Statistiques' : 
                   activeTab === 'controle' ? 'Contrôle' : 
                   activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-xs text-gray-500">Portail TFH - Direction</p>
              </div>
              <div className="w-10"></div>
            </div>
          </header>

          {/* En-tête desktop */}
          <div className="hidden md:block bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  {activeTab === 'dashboard' ? 'Tableau de bord' : 
                   activeTab === 'lecteur-interne' ? 'Lecteur interne' :
                   activeTab === 'planning-personnel' ? 'Planning personnel' :
                   activeTab === 'liste-tfh' ? 'Liste des TFH' :
                   activeTab === 'convocations' ? 'Convocations' : 
                   activeTab === 'presences' ? 'Présences' : 
                   activeTab === 'defenses' ? 'Défenses' : 
                   activeTab === 'calendrier' ? 'Calendrier' : 
                   activeTab === 'stats' ? 'Statistiques' : 
                   activeTab === 'controle' ? 'Contrôle' : 
                   activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-sm text-gray-500">
                  Interface Direction - {userName}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  Direction
                </span>
                <button
                  onClick={() => {
                    localStorage.clear();
                    router.push('/');
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
          
          {/* Contenu de l'onglet */}
          <div className="p-4 md:p-6">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
}
