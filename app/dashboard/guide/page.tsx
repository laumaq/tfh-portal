// app/login/page.tsx - Version ultra simple
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
      // 1. ESSAYER LES GUIDES - CHAMP "identifiant"
      try {
        const { data: guideData, error: guideError } = await supabase
          .from('guides')
          .select('*')
          .eq('identifiant', identifiant.trim())
          .single();

        if (!guideError && guideData) {
          if (guideData.password === password) {
            localStorage.setItem('userType', 'guide');
            localStorage.setItem('userId', guideData.id);
            localStorage.setItem('userName', guideData.nom);
            router.push('/dashboard/guide');
            return;
          }
        }
      } catch (guideErr) {
        // Continuer
      }

      // 2. ESSAYER LES COORDINATEURS - CHAMP "identifiant"  
      try {
        const { data: coordData, error: coordError } = await supabase
          .from('coordinateurs')
          .select('*')
          .eq('identifiant', identifiant.trim())
          .single();

        if (!coordError && coordData) {
          if (coordData.password === password) {
            localStorage.setItem('userType', 'coordinateur');
            localStorage.setItem('userId', coordData.id);
            localStorage.setItem('userName', coordData.nom);
            router.push('/dashboard/coordinateur');
            return;
          }
        }
      } catch (coordErr) {
        // Continuer
      }

      // 3. ESSAYER LES ÉLÈVES - CHAMP "identifiant"
      try {
        const { data: eleveData, error: eleveError } = await supabase
          .from('eleves')
          .select('*')
          .eq('identifiant', identifiant.trim())
          .single();

        if (!eleveError && eleveData) {
          if (eleveData.password === password) {
            localStorage.setItem('userType', 'eleve');
            localStorage.setItem('userId', eleveData.id);
            localStorage.setItem('userName', `${eleveData.prenom} ${eleveData.nom}`);
            router.push('/dashboard/eleve');
            return;
          }
        }
      } catch (eleveErr) {
        // Continuer
      }

      // Si rien n'a marché
      setError('Identifiant ou mot de passe incorrect');

    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Connexion TFH
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
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
              className="w-full px-4 py-2 border rounded-lg"
              required
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
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
