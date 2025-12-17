import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour TypeScript
export interface Coordinateur {
  id: string;
  nom: string;
  initiale: string;
  mot_de_passe: string;
  created_at: string;
}

export interface Guide {
  id: string;
  nom: string;
  initiale: string;
  mot_de_passe: string | null;
  created_at: string;
}

export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  classe: string;
  problematique: string | null;
  categorie: string | null;
  guide_id: string | null;
  mot_de_passe: string | null;
  convocation_mars: string;
  convocation_avril: string;
  presence_9_mars: boolean;
  presence_10_mars: boolean;
  presence_16_avril: boolean;
  presence_17_avril: boolean;
  created_at: string;
}
