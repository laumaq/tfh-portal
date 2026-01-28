export const CONVOCATION_OPTIONS = [
  { value: '', label: '-', color: 'bg-gray-100' },
  { value: 'non_objectifs_atteints', label: 'Non, l\'élève atteint bien les objectifs', color: 'bg-green-100 text-green-800' },
  { value: 'oui_objectifs_non_atteints', label: 'Oui, l\'élève n\'atteint pas les objectifs', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'oui_pas_avance', label: 'Oui, l\'élève n\'a pas avancé', color: 'bg-red-100 text-red-800' },
  { value: 'oui_pas_communique', label: 'Oui, l\'élève n\'a pas communiqué', color: 'bg-orange-100 text-orange-800' },
] as const;

export const TABS_CONFIG = [
  {
    id: 'dashboard',
    name: 'Tableau de bord',
    icon: '🛡️',
    color: 'blue',
  },
  {
    id: 'convocations',
    name: 'Convocations',
    icon: '📝',
    color: 'purple',
  },
  {
    id: 'defenses',
    name: 'Défenses',
    icon: '🎓',
    color: 'green',
  },
  {
    id: 'calendrier',
    name: 'Calendrier',
    icon: '📅',
    color: 'orange',
  },
  {
    id: 'gestion-utilisateurs',
    name: 'Utilisateurs',
    icon: '👥',
    color: 'indigo',
  },
  {
    id: 'parametres',
    name: 'Paramètres',
    icon: '⚙️',
    color: 'gray',
  },
  {
    id: 'stats',
    name: 'Statistiques',
    icon: '📊',
    color: 'emerald',
  },
  {
    id: 'controle',
    name: 'Contrôle',
    icon: '👑',
    color: 'red',
  },
] as const;
