import { Eleve } from '../types';

// Interface pour une journée
export interface Journee {
  key: string; // "Journee_1", "Journee_2", etc.
  date: Date;
  nom: string; // "Journée 1"
}

// Interface pour une session (regroupement de journées)
export interface Session {
  id: string; // "session_1", "session_2"
  nom: string; // "Session 1", "Session mars", etc.
  date_debut: Date;
  date_fin: Date;
  journees: string[]; // Liste des clés des journées ["Journee_4", "Journee_5"]
}

/**
 * Récupère toutes les journées depuis system_settings
 */
export async function getJourneesFromSupabase(supabase: any): Promise<Journee[]> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .like('setting_key', 'Journee_%')
    .order('setting_key');

  if (error) {
    console.error('Erreur lors de la récupération des journées:', error);
    return [];
  }

  return data
    .map((item: any) => ({
      key: item.setting_key,
      date: new Date(item.setting_value),
      nom: item.description || item.setting_key.replace('_', ' ')
    }))
    .sort((a: Journee, b: Journee) => a.date.getTime() - b.date.getTime());
}

/**
 * Détecte les sessions automatiquement à partir des journées
 * Regroupe les journées à moins de 7 jours d'écart
 */
export function detecterSessions(journees: Journee[]): Session[] {
  if (journees.length === 0) return [];

  const sortedJournees = [...journees].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  const sessions: Session[] = [];
  let currentSession: Session | null = null;

  for (let i = 0; i < sortedJournees.length; i++) {
    const journee = sortedJournees[i];

    if (!currentSession) {
      // Nouvelle session
      currentSession = {
        id: `session_${sessions.length + 1}`,
        nom: `Session ${sessions.length + 1}`,
        date_debut: journee.date,
        date_fin: journee.date,
        journees: [journee.key]
      };
    } else {
      // Vérifier si cette journée appartient à la session en cours
      const joursDifference = Math.abs(
        (journee.date.getTime() - currentSession.date_fin.getTime()) / (1000 * 3600 * 24)
      );

      if (joursDifference <= 7) {
        // Ajouter à la session en cours
        currentSession.date_fin = journee.date;
        currentSession.journees.push(journee.key);
      } else {
        // Finaliser la session en cours et commencer une nouvelle
        sessions.push(currentSession);
        currentSession = {
          id: `session_${sessions.length + 1}`,
          nom: `Session ${sessions.length + 1}`,
          date_debut: journee.date,
          date_fin: journee.date,
          journees: [journee.key]
        };
      }
    }
  }

  // Ajouter la dernière session
  if (currentSession) {
    sessions.push(currentSession);
  }

  // Nommer les sessions de manière plus descriptive si possible
  sessions.forEach((session, index) => {
    const mois = session.date_debut.toLocaleString('fr-FR', { month: 'long' });
    session.nom = `Session ${mois} ${session.date_debut.getFullYear()}`;
    
    // Vérifier si on dépasse la limite
    if (index >= 20) {
      console.warn(`⚠️ Plus de 20 sessions détectées (${sessions.length} au total)`);
    }
  });

  return sessions;
}

/**
 * Vérifie si un élève est convoqué à une session
 */
export function estConvoque(eleve: Eleve, sessionIndex: number): boolean {
  const key = `session_${sessionIndex}_convoque`;
  const valeur = (eleve as any)[key] as string | undefined;
  
  // Convoqué si la valeur commence par "Oui"
  return valeur?.startsWith('Oui') === true;
}

/**
 * Obtient le statut de présence pour une journée
 */
export function getPresenceJournee(eleve: Eleve, journeeIndex: number): boolean | null {
  const key = `journee_${journeeIndex}_present`;
  const valeur = (eleve as any)[key];
  
  // Conversion pour rétrocompatibilité
  if (valeur === true) return true;
  if (valeur === false) return false;
  return null; // null = non défini
}

/**
 * Calcule le statut global d'une session basé sur les présences des journées
 */
export function getStatutSession(eleve: Eleve, session: Session): string {
  if (!estConvoque(eleve, parseInt(session.id.split('_')[1]))) {
    return 'non-convoque';
  }

  const presences = session.journees.map(journeeKey => {
    const journeeIndex = parseInt(journeeKey.split('_')[1]);
    return getPresenceJournee(eleve, journeeIndex);
  });

  // Si toutes les présences sont null = non défini
  if (presences.every(p => p === null)) {
    return 'en-attente';
  }

  // Si toutes les présences sont true = présent
  if (presences.every(p => p === true)) {
    return 'present';
  }

  // Si au moins une présence est false = absent
  if (presences.some(p => p === false)) {
    return 'absent';
  }

  // Mix de true/null = partiellement présent
  return 'partiellement-present';
}

/**
 * Met à jour la présence pour une journée
 */
/**
 * Met à jour la présence pour une journée
 */
export function mettreAJourPresence(
  eleve: Eleve,
  journeeIndex: number,
  nouvelleValeur: boolean | null
): Eleve {
  const nouvelEleve = { ...eleve } as any; // Cast l'objet entier en any
  
  const key = `journee_${journeeIndex}_present`;
  nouvelEleve[key] = nouvelleValeur;
  
  return nouvelEleve as Eleve;
}

export function mettreAJourConvocation(
  eleve: Eleve,
  sessionIndex: number,
  nouvelleValeur: string
): Eleve {
  const nouvelEleve = { ...eleve } as any;
  const key = `session_${sessionIndex}_convoque`;
  nouvelEleve[key] = nouvelleValeur;
  return nouvelEleve as Eleve;
}
