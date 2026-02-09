// app/dashboard/direction/page.tsx - Version mise à jour
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingSpinner from '../coordinateur/components/LoadingSpinner';
import DashboardTabDirection from './tabs/DashboardTab';
import ListeTFHTab from './tabs/ListeTFHTab';
import ConvocationsTab from './tabs/ConvocationsTab';
import PresencesTab from './tabs/PresencesTab';
import DefensesTab from './tabs/DefensesTab';
import CalendrierTab from './tabs/CalendrierTab';
import StatsTab from './tabs/StatsTab';
import ControleTab from './tabs/ControleTab';
import LecteurInterneTab from './tabs/LecteurInterneTab';
import PlanningPersonnelTab from './tabs/PlanningPersonnelTab';
import InterfaceGuideTab from './tabs/InterfaceGuideTab';
import { useDirectionData } from './hooks/useDirectionData';
import { DirectionTabType } from './types';

export default function DirectionDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DirectionTabType>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');

  // Utiliser les hooks custom
  const { 
    eleves, 
    guides, 
    lecteursExternes, 
    mediateurs, 
    categories,
    currentGuide,
    loading, 
    refreshData 
  } = useDirectionData(activeTab === 'dashboard');

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
          <DashboardTabDirection 
            eleves={eleves}
            guides={guides}
            onTabChange={setActiveTab}
            userName={userName}
            guideNom={currentGuide?.nom || ''}
            guidePrenom={currentGuide?.initiale || ''}
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
          />
        );
            
      case 'convocations':
        return (
          <ConvocationsTab
            eleves={eleves}
            guides={guides}
            onRefresh={refreshData}
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
            onRefresh={refreshData}
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
            onRefresh={refreshData}
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
          />
        );

      case 'stats':
        return (
          <StatsTab />
        );

      case 'controle':
        return (
          <ControleTab />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar direction */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          elevesCount={eleves.length}
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
          userName={userName}
          onLogout={() => {
            localStorage.clear();
            router.push('/');
          }}
        />
        
        {/* Contenu principal */}
        <main className="flex-1 overflow-auto">
          {/* En-tête desktop */}
          <Header 
            activeTab={activeTab}
            userName={userName}
            onLogout={() => {
              localStorage.clear();
              router.push('/');
            }}
          />
          
          {/* Contenu de l'onglet */}
          <div className="p-4 md:p-6">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
}
