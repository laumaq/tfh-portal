// 1. Réexporter tous les types AVEC 'export type'
export type {
  Eleve,
  Guide,  // Garde Guide ici
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

// 2. Types spécifiques direction
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

// 3. SUPPRIME DirectionMember pour l'instant, ou redéfinis-le complètement
// export interface DirectionMember extends Guide {
//   direction_id: string;
//   added_at: string;
// }

// OU redéfinis complètement :
export interface DirectionMember {
  id: string;
  nom: string;
  prenom: string; 
  initiale: string;
  email?: string;
  mot_de_passe?: string | null;
  direction_id: string;
  added_at: string;
}
