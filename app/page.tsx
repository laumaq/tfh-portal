// app/page.tsx - Page de connexion
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [nom, setNom] = useState('');
  const [initiale, setInitiale] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Vérifier si c'est un coordinateur
      const { data: coordData } = await supabase
        .from('coordinateurs')
        .select('*')
        .eq('nom', nom)
        .eq('initiale', initiale)
        .single();

      if (coordData) {
        if (coordData.mot_de_passe === password) {
          localStorage.setItem('userType', 'coordinateur');
          localStorage.setItem('userId', coordData.id);
          localStorage.setItem('userName', `${coordData.nom} ${coordData.initiale}.`);
          router.push('/dashboard/coordinateur');
          return;
        } else {
          setError('Mot de passe incorrect');
          setLoading(false);
          return;
        }
      }

      // Vérifier si c'est un guide
      const { data: guideData } = await supabase
        .from('guides')
        .select('*')
        .eq('nom', nom)
        .eq('initiale', initiale)
        .single();

      if (guideData) {
        // Première connexion - enregistrer le mot de passe
        if (!guideData.mot_de_passe) {
          await supabase
            .from('guides')
            .update({ mot_de_passe: password })
            .eq('id', guideData.id);
          
          localStorage.setItem('userType', 'guide');
          localStorage.setItem('userId', guideData.id);
          localStorage.setItem('userName', `${guideData.nom} ${guideData.initiale}.`);
          router.push('/dashboard/guide');
          return;
        }

        // Connexion normale
        if (guideData.mot_de_passe === password) {
          localStorage.setItem('userType', 'guide');
          localStorage.setItem('userId', guideData.id);
          localStorage.setItem('userName', `${guideData.nom} ${guideData.initiale}.`);
          router.push('/dashboard/guide');
          return;
        } else {
          setError('Mot de passe incorrect');
          setLoading(false);
          return;
        }
      }

      // Vérifier si c'est un élève
      const { data: eleveData } = await supabase
        .from('eleves')
        .select('*')
        .eq('nom', nom)
        .eq('initiale', initiale)
        .single();

      if (eleveData) {
        // Première connexion - enregistrer le mot de passe
        if (!eleveData.mot_de_passe) {
          await supabase
            .from('eleves')
            .update({ mot_de_passe: password })
            .eq('id', eleveData.id);
          
          localStorage.setItem('userType', 'eleve');
          localStorage.setItem('userId', eleveData.id);
          localStorage.setItem('userName', `${eleveData.nom} ${eleveData.initiale}.`);
          router.push('/dashboard/eleve');
          return;
        }

        // Connexion normale
        if (eleveData.mot_de_passe === password) {
          localStorage.setItem('userType', 'eleve');
          localStorage.setItem('userId', eleveData.id);
          localStorage.setItem('userName', `${eleveData.nom} ${eleveData.initiale}.`);
          router.push('/dashboard/eleve');
          return;
        } else {
          setError('Mot de passe incorrect');
          setLoading(false);
          return;
        }
      }

      setError('Utilisateur non trouvé');
      setLoading(false);
    } catch (err) {
      setError('Erreur de connexion');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Portail TFH
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initiale du prénom
            </label>
            <input
              type="text"
              value={initiale}
              onChange={(e) => setInitiale(e.target.value.toUpperCase())}
              maxLength={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              À la première connexion, ce mot de passe sera enregistré
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
