// app/dashboard/direction/components/Header.tsx
'use client';

interface HeaderProps {
  activeTab: string;
  userName: string;
  onLogout: () => void;
}

export default function Header({ activeTab, userName, onLogout }: HeaderProps) {
  // Fonction pour formater le titre de l'onglet
  const formatTabName = (tab: string) => {
    const tabNames: Record<string, string> = {
      'dashboard': 'Tableau de bord',
      'interface-guide': 'Interface Guide',
      'lecteur-interne': 'Lecteur Interne',
      'planning-personnel': 'Planning Personnel',
      'liste-tfh': 'Liste des TFH',
      'convocations': 'Convocations',
      'presences': 'Présences',
      'defenses': 'Défenses',
      'calendrier': 'Calendrier',
      'stats': 'Statistiques',
      'controle': 'Contrôle'
    };
    
    return tabNames[tab] || tab.charAt(0).toUpperCase() + tab.slice(1);
  };

  return (
    <header className="hidden md:block bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {formatTabName(activeTab)}
          </h1>
          <p className="text-sm text-gray-500">
            Interface Direction - {userName}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              Direction
            </span>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
