// app/login/page.tsx - Version corrigée
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Tentative de connexion avec:', identifiant);
      
      // ESSAYER TOUS LES CHAMPS POSSIBLES POUR LES GUIDES
      // Option 1: Chercher par "identifiant"
      let { data: guideData, error: guideError } = await supabase
        .from('guides')
        .select('id, nom, password')
        .or(`identifiant.eq.${identifiant},email.eq.${identifiant},username.eq.${identifiant}`)
        .single();

      console.log('Résultat recherche guide:', { guideData, guideError });

      // Si pas trouvé par OR, essayer une autre méthode
      if (guideError) {
        // Option 2: Chercher toutes les colonnes textuelles
        const { data: allGuides, error } = await supabase
          .from('guides')
          .select('*')
          .limit(10);
        
        if (!error && allGuides) {
          // Chercher manuellement
          guideData = allGuides.find(guide => 
            guide.identifiant === identifiant || 
            guide.email === identifiant ||
            guide.username === identifiant ||
            guide.nom === identifiant
          );
          guideError = guideData ? null : new Error('Non trouvé');
        }
      }

      if (!guideError && guideData) {
        console.log('Guide trouvé:', guideData);
        
        // Vérifier le mot de passe
        if (guideData.password === password) {
          console.log('Mot de passe correct');
          localStorage.setItem('userType', 'guide');
          localStorage.setItem('userId', guideData.id);
          localStorage.setItem('userName', guideData.nom);
          router.push('/dashboard/guide');
          return;
        } else {
          console.log('Mot de passe incorrect');
        }
      }

      // MÊME LOGIQUE POUR LES COORDINATEURS
      let { data: coordData, error: coordError } = await supabase
        .from('coordinateurs')
        .select('id, nom, password')
        .or(`identifiant.eq.${identifiant},email.eq.${identifiant}`)
        .single();

      if (coordError) {
        const { data: allCoords, error } = await supabase
          .from('coordinateurs')
          .select('*')
          .limit(10);
        
        if (!error && allCoords) {
          coordData = allCoords.find(coord => 
            coord.identifiant === identifiant || 
            coord.email === identifiant ||
            coord.nom === identifiant
          );
          coordError = coordData ? null : new Error('Non trouvé');
        }
      }

      if (!coordError && coordData) {
        console.log('Coordinateur trouvé:', coordData);
        
        if (coordData.password === password) {
          localStorage.setItem('userType', 'coordinateur');
          localStorage.setItem('userId', coordData.id);
          localStorage.setItem('userName', coordData.nom);
          router.push('/dashboard/coordinateur');
          return;
        }
      }

      // MÊME LOGIQUE POUR LES ÉLÈVES
      let { data: eleveData, error: eleveError } = await supabase
        .from('eleves')
        .select('id, nom, prenom, password')
        .or(`identifiant.eq.${identifiant},email.eq.${identifiant}`)
        .single();

      if (eleveError) {
        const { data: allEleves, error } = await supabase
          .from('eleves')
          .select('*')
          .limit(10);
        
        if (!error && allEleves) {
          eleveData = allEleves.find(eleve => 
            eleve.identifiant === identifiant || 
            eleve.email === identifiant ||
            `${eleve.prenom} ${eleve.nom}` === identifiant ||
            eleve.nom === identifiant
          );
          eleveError = eleveData ? null : new Error('Non trouvé');
        }
      }

      if (!eleveError && eleveData) {
        console.log('Élève trouvé:', eleveData);
        
        if (eleveData.password === password) {
          localStorage.setItem('userType', 'eleve');
          localStorage.setItem('userId', eleveData.id);
          localStorage.setItem('userName', `${eleveData.prenom} ${eleveData.nom}`);
          router.push('/dashboard/eleve');
          return;
        }
      }

      // Si on arrive ici, aucun utilisateur trouvé
      setError('Identifiant ou mot de passe incorrect');
      console.log('Aucun utilisateur trouvé pour:', identifiant);
      
    } catch (err) {
      console.error('Erreur complète de connexion:', err);
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Connexion TFH
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identifiant
            </label>
            <input
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Votre identifiant"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Votre mot de passe"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {/* Debug info - À GARDER TEMPORAIREMENT */}
        <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <p className="font-medium mb-1">Debug info:</p>
          <p>Utilisez l'identifiant EXACT comme dans la base</p>
          <p className="mt-2">
            <button
              onClick={() => {
                // Testez différents identifiants
                setIdentifiant('test@example.com');
                setPassword('test123');
              }}
              className="text-blue-600 underline"
            >
              Remplir test
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
