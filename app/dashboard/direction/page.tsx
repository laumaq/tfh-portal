// app/dashboard/direction/page.tsx - Version simplifiée
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
import { Eleve } from '../coordinateur/types';

// Définir un type étendu qui inclut les relations
interface EleveWithRelations extends Eleve {
  guide?: { id: string; nom: string; prenom: string };
  lecteur_interne?: { id: string; nom: string; prenom: string };
  lecteur_externe?: { id: string; nom: string; prenom: string };
  mediateur?: { id: string; nom: string; prenom: string };
}

export default function DirectionDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DirectionTabType>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');

  // Utiliser les hooks custom - PLUS SIMPLE MAINTENANT
  const { 
    eleves, 
    guides, 
    lecteursExternes, 
    mediateurs, 
    categories,
    currentGuide,
    loading, 
    refreshData 
  } = useDirectionData(); // <-- Plus de paramètres

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
        // Ici on peut filtrer : seulement les élèves où l'utilisateur est guide
        const elevesGuide = eleves.filter(e => e.guide_id === currentGuide?.id);
        return (
          <InterfaceGuideTab
            guideId={currentGuide?.id || ''}
            onRefresh={refreshData}
          />
        );
      
      case 'lecteur-interne':
        // Ici on filtre : seulement les élèves où l'utilisateur est lecteur interne
        const elevesLecteur = eleves.filter(e => e.lecteur_interne_id === currentGuide?.id);
        return (
          <LecteurInterneTab
            eleves={elevesLecteur}
            guideId={currentGuide?.id || ''}
            onRefresh={refreshData}
          />
        );
      
      case 'planning-personnel':
        // Pour le planning personnel, on peut montrer tous les élèves
        // OU filtrer selon les besoins
        return (
          <PlanningPersonnelTab
            guideId={currentGuide?.id || ''}
            eleves={eleves}
          />
        );
        
      case 'liste-tfh':
        // Liste complète des TFH
        return (
          <ListeTFHTab
            eleves={eleves}
            onRefresh={refreshData}
          />
        );
            
      case 'convocations':
        // Convocations - tous les élèves
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
        // Présences - tous les élèves
        return (
          <PresencesTab
            eleves={eleves as EleveWithRelations[]}
            onRefresh={refreshData}
            canEdit={(eleve) => {
              const eleveWithRelations = eleve as EleveWithRelations;
              return (
                eleveWithRelations.guide?.id === currentGuide?.id || 
                eleveWithRelations.lecteur_interne?.id === currentGuide?.id
              );
            }}
          />
        );
      
      case 'defenses': 
        // Défenses - tous les élèves
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
        // Calendrier - tous les élèves
        return (
          <CalendrierTab
            eleves={eleves}
            categories={categories}
            onRefresh={refreshData}
          />
        );

      case 'stats':
        // Statistiques - utilise les données complètes
        return (
          <StatsTab />
        );

      case 'controle':
        // Contrôle - utilise les données complètes
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
          elevesCount={eleves.length} // <-- Maintenant toujours le compte TOTAL
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
