'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCoordinateurData } from './hooks/useCoordinateurData';
import { useElevesOperations } from './hooks/useElevesOperations';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardTab from './tabs/DashboardTab';
import ConvocationsTab from './tabs/ConvocationsTab';
import DefensesTab from './tabs/DefensesTab';
import CalendrierTab from './tabs/CalendrierTab';
import GestionUtilisateursTab from './tabs/GestionUtilisateursTab';
import ParametresTab from './tabs/ParametresTab';
import StatsTab from './tabs/StatsTab';
import ControleTab from './tabs/ControleTab';

type TabType = 'dashboard' | 'convocations' | 'defenses' | 'calendrier' | 
               'gestion-utilisateurs' | 'parametres' | 'stats' | 'controle';

export default function CoordinateurDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [editingModeConvocations, setEditingModeConvocations] = useState(false);
  const [editingModeDefenses, setEditingModeDefenses] = useState(false);
  
  // Utiliser les hooks custom
  const { 
    eleves, 
    guides, 
    lecteursExternes, 
    mediateurs, 
    coordinateurs, 
    loading, 
    refreshData 
  } = useCoordinateurData();
  
  const { handleUpdate, handlePresenceUpdate } = useElevesOperations();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          elevesCount={eleves.length}
          guidesCount={guides.length}
          defensesCount={eleves.filter(e => e.date_defense).length}
        />
        
        <main className="flex-1 overflow-auto">
          <Header 
            activeTab={activeTab}
            onLogout={() => {
              localStorage.clear();
              router.push('/');
            }}
          />
          
          <div className="p-4 md:p-6">
            {activeTab === 'dashboard' && (
              <DashboardTab 
                eleves={eleves}
                guides={guides}
                onTabChange={setActiveTab}
              />
            )}
            
            {activeTab === 'convocations' && (
              <ConvocationsTab
                eleves={eleves}
                guides={guides}
                editingMode={editingModeConvocations}
                onUpdate={handleUpdate}
                onPresenceUpdate={handlePresenceUpdate}
                onRefresh={refreshData}
              />
            )}
            
            {activeTab === 'defenses' && (
              <DefensesTab
                eleves={eleves}
                guides={guides}
                lecteursExternes={lecteursExternes}
                mediateurs={mediateurs}
                editingMode={editingModeDefenses}
                onUpdate={handleUpdate}
                onRefresh={refreshData}
              />
            )}
            
            {/* ... autres onglets ... */}
          </div>
        </main>
      </div>
    </div>
  );
}
