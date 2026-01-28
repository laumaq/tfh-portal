'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import DashboardTab from './tabs/DashboardTab';
import ConvocationsTab from './tabs/ConvocationsTab';
import DefensesTab from './tabs/DefensesTab';
import CalendrierTab from './tabs/CalendrierTab';
import ParametresTab from './tabs/ParametresTab';
import GestionUtilisateursTab from './tabs/GestionUtilisateursTab';
import { useCoordinateurData } from './hooks/useCoordinateurData';
import { useElevesOperations } from './hooks/useElevesOperations';
import { TabType } from './types';

export default function CoordinateurDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [editingModeConvocations, setEditingModeConvocations] = useState(false);
  const [editingModeDefenses, setEditingModeDefenses] = useState(false);
  
  
  // Utiliser les hooks custom
  const { 
    eleves, 
    guides, 
    lecteursExternes, 
    mediateurs, 
    coordinateurs, 
    categories,
    loading, 
    refreshData 
  } = useCoordinateurData();
  
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
    
    if (userType !== 'coordinateur') {
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
          />
        );
        
      case 'convocations':
        return (
          <ConvocationsTab
            eleves={eleves}
            guides={guides}
            categories={categories}
            editingMode={editingModeConvocations}
            editingCell={editingCell}
            onUpdate={handleUpdate}
            onSelectUpdate={handleSelectUpdate}
            onPresenceUpdate={handlePresenceUpdate}
            onRefresh={refreshData}
            onSetEditingCell={setEditingCell}
            onSetEditingMode={setEditingModeConvocations}
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

      case 'gestion-utilisateurs':
        return (
          <GestionUtilisateursTab
            eleves={eleves}
            guides={guides}
            lecteursExternes={lecteursExternes}
            mediateurs={mediateurs}
            coordinateurs={coordinateurs}
            onRefresh={refreshData}
          />
        );

      case 'parametres-affichage':
        return <ParametresTab />;
        
      default:
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Onglet {activeTab} - En cours de modularisation
            </h2>
            <p className="text-gray-600 mt-2">
              Cet onglet sera bientôt extrait dans un composant séparé.
            </p>
            <button
              onClick={() => setActiveTab('convocations')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voir l'onglet Convocations (modularisé)
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          elevesCount={eleves.length}
          guidesCount={guides.length}
          defensesCount={eleves.filter(e => e.date_defense).length}
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
                   activeTab === 'convocations' ? 'Convocations' : 
                   activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-xs text-gray-500">TFH Portal</p>
              </div>
              <div className="w-10"></div>
            </div>
          </header>

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







