// 1. D'abord réexporter tous les types
export type {
  Eleve,
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

export { Guide } from '../../coordinateur/types';

// 2. Ensuite définir tes types spécifiques
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

// 3. Maintenant tu peux utiliser Guide car il est déjà réexporté
export interface DirectionMember extends Guide {
  direction_id: string;
  added_at: string;
}
