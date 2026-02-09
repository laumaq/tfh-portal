// Réexporter les types de base depuis coordinateur
export type {
  Eleve,
  Guide,
  LecteurExterne,
  Mediateur,
  DefenseEvent,
  DayDefenses,
  Conflict,
  StatsData,
  GuideStats,
  JourneeTFH,
  DisplaySettings
} from '../../coordinateur/types';

// Types spécifiques à la direction
export type DirectionTabType = 
  | 'dashboard'
  | 'interface-guide'
  | 'lecteur-interne'
  | 'planning-personnel'
  | 'liste-tfh'
  | 'convocations'
  | 'presences'
  | 'defenses'
  | 'calendrier'
  | 'stats'
  | 'controle';

export type DirectionUserType = 'direction';

// Interface pour les membres de la direction
export interface DirectionMember extends Guide {
  direction_id: string;
  added_at: string;
}
