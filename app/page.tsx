// app/page.tsx - Page de connexion avec médiateurs et lecteurs externes
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
      // Normaliser les entrées (majuscules pour l'initiale, capitalisation pour le nom)
      const nomNormalized = nom.toUpperCase();
      const initialeNormalized = initiale.toUpperCase();

      // 1. VÉRIFIER LES COORDINATEURS (code existant)
      const { data: coordData, error: coordError } = await supabase
        .from('coordinateurs')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('initiale', initialeNormalized)
        .maybeSingle();
      
      if (!coordError && coordData) {
        const storedPassword = coordData.mot_de_passe;
        
        console.log("DEBUG - Coordinateur trouvé:", {
          nom: coordData.nom,
          storedPassword,
          isNull: storedPassword === null,
          isEmpty: storedPassword === ''
        });
      
        // CAS 1: PREMIÈRE CONNEXION (chaîne vide)
        if (storedPassword === '') {
          console.log("Première connexion - enregistrement du mot de passe");
          
          // Enregistrer le mot de passe
          const { error: updateError } = await supabase
            .from('coordinateurs')
            .update({ mot_de_passe: password })
            .eq('id', coordData.id);
          
          if (updateError) {
            console.error("Erreur enregistrement:", updateError);
            setError('Erreur technique. Réessayez.');
            setLoading(false);
            return;
          }
          
          // Connecter l'utilisateur
          localStorage.setItem('userType', 'coordinateur');
          localStorage.setItem('userId', coordData.id);
          localStorage.setItem('userName', `${coordData.nom} ${coordData.initiale}.`);
          router.push('/dashboard/coordinateur');
          return;
        }
        
        // CAS 2: MOT DE PASSE EXISTANT
        if (storedPassword === password) {
          console.log("Connexion réussie");
          localStorage.setItem('userType', 'coordinateur');
          localStorage.setItem('userId', coordData.id);
          localStorage.setItem('userName', `${coordData.nom} ${coordData.initiale}.`);
          router.push('/dashboard/coordinateur');
          return;
        } else {
          console.log("Mot de passe incorrect ou vide");
          setError('Mot de passe incorrect');
          setLoading(false);
          return;
        }
      }

      // 2. VÉRIFIER LES GUIDES (code existant)
      const { data: guideData, error: guideError } = await supabase
        .from('guides')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('initiale', initialeNormalized)
        .maybeSingle();

      if (!guideError && guideData) {
        const storedPassword = guideData.mot_de_passe;
        
        // CAS 1: PREMIÈRE CONNEXION (NULL ou chaîne vide)
        if (!storedPassword || storedPassword === '') {
          console.log("Première connexion guide - enregistrement du mot de passe");
          
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

        // CAS 2: MOT DE PASSE EXISTANT
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

      // 3. VÉRIFIER LES ÉLÈVES (code existant)
      const { data: eleveData, error: eleveError } = await supabase
        .from('eleves')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('initiale', initialeNormalized)
        .maybeSingle();

      if (!eleveError && eleveData) {
        const storedPassword = eleveData.mot_de_passe;
        
        // CAS 1: PREMIÈRE CONNEXION (NULL ou chaîne vide)
        if (!storedPassword || storedPassword === '') {
          console.log("Première connexion élève - enregistrement du mot de passe");
          
          await supabase
            .from('eleves')
            .update({ mot_de_passe: password })
            .eq('id', eleveData.id);
          
          localStorage.setItem('userType', 'eleve');
          localStorage.setItem('userId', eleveData.id);
          localStorage.setItem('userName', `${eleveData.nom} ${eleveData.prenom}`);
          router.push('/dashboard/eleve');
          return;
        }

        // CAS 2: MOT DE PASSE EXISTANT
        if (eleveData.mot_de_passe === password) {
          localStorage.setItem('userType', 'eleve');
          localStorage.setItem('userId', eleveData.id);
          localStorage.setItem('userName', `${eleveData.nom} ${eleveData.prenom}`);
          router.push('/dashboard/eleve');
          return;
        } else {
          setError('Mot de passe incorrect');
          setLoading(false);
          return;
        }
      }

      // 4. VÉRIFIER LES MÉDIATEURS (NOUVEAU)
      const { data: mediateurData, error: mediateurError } = await supabase
        .from('mediateurs')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('prenom', initialeNormalized + '%') // Cherche par prénom commençant par l'initiale
        .maybeSingle();

      if (!mediateurError && mediateurData) {
        const storedPassword = mediateurData.mot_de_passe;
        
        console.log("DEBUG - Médiateur trouvé:", {
          nom: mediateurData.nom,
          prenom: mediateurData.prenom,
          storedPassword
        });

        // CAS 1: PREMIÈRE CONNEXION (NULL ou chaîne vide)
        if (!storedPassword || storedPassword === '') {
          console.log("Première connexion médiateur - enregistrement du mot de passe");
          
          await supabase
            .from('mediateurs')
            .update({ mot_de_passe: password })
            .eq('id', mediateurData.id);
          
          localStorage.setItem('userType', 'mediateur');
          localStorage.setItem('userId', mediateurData.id);
          localStorage.setItem('userName', `${mediateurData.prenom} ${mediateurData.nom}`);
          router.push('/dashboard/mediateur');
          return;
        }

        // CAS 2: MOT DE PASSE EXISTANT
        if (mediateurData.mot_de_passe === password) {
          localStorage.setItem('userType', 'mediateur');
          localStorage.setItem('userId', mediateurData.id);
          localStorage.setItem('userName', `${mediateurData.prenom} ${mediateurData.nom}`);
          router.push('/dashboard/mediateur');
          return;
        } else {
          setError('Mot de passe incorrect');
          setLoading(false);
          return;
        }
      }

      // 5. VÉRIFIER LES LECTEURS EXTERNES (NOUVEAU)
      const { data: lecteurData, error: lecteurError } = await supabase
        .from('lecteurs_externes')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('prenom', initialeNormalized + '%') // Cherche par prénom commençant par l'initiale
        .maybeSingle();

      if (!lecteurError && lecteurData) {
        const storedPassword = lecteurData.mot_de_passe;
        
        console.log("DEBUG - Lecteur externe trouvé:", {
          nom: lecteurData.nom,
          prenom: lecteurData.prenom,
          storedPassword
        });

        // CAS 1: PREMIÈRE CONNEXION (NULL ou chaîne vide)
        if (!storedPassword || storedPassword === '') {
          console.log("Première connexion lecteur externe - enregistrement du mot de passe");
          
          await supabase
            .from('lecteurs_externes')
            .update({ mot_de_passe: password })
            .eq('id', lecteurData.id);
          
          localStorage.setItem('userType', 'lecteur_externe');
          localStorage.setItem('userId', lecteurData.id);
          localStorage.setItem('userName', `${lecteurData.prenom} ${lecteurData.nom}`);
          router.push('/dashboard/lecteur_externe');
          return;
        }

        // CAS 2: MOT DE PASSE EXISTANT
        if (lecteurData.mot_de_passe === password) {
          localStorage.setItem('userType', 'lecteur_externe');
          localStorage.setItem('userId', lecteurData.id);
          localStorage.setItem('userName', `${lecteurData.prenom} ${lecteurData.nom}`);
          router.push('/dashboard/lecteur_externe');
          return;
        } else {
          setError('Mot de passe incorrect');
          setLoading(false);
          return;
        }
      }

      // Si aucune correspondance trouvée dans aucune table
      setError('Utilisateur non trouvé. Vérifiez votre nom et votre initiale.');
      setLoading(false);
      
    } catch (err) {
      console.error('Erreur inattendue lors de la connexion:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // Le JSX reste identique...
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
              autoComplete="family-name"
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
              autoComplete="given-name-initial"
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
              autoComplete="current-password"
            />
            <p className="text-xs text-gray-500 mt-1">
              À la première connexion, ce mot de passe sera enregistré
            </p>
          </div>

          {error && (
            <div className={`p-3 rounded-lg text-sm ${error.includes('incorrect') || error.includes('non trouvé') ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        {/* Section debug - À retirer en production */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-500 font-medium">Informations de débogage</summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
              <p>Valeurs testées:</p>
              <p>Nom: {nom || '(vide)'} → Normalisé: {nom.toUpperCase() || '(vide)'}</p>
              <p>Initiale: {initiale || '(vide)'} → Normalisé: {initiale.toUpperCase() || '(vide)'}</p>
              <p className="text-xs text-gray-500">
                Nouveaux types: Médiateur, Lecteur externe
              </p>
              <button 
                onClick={() => { 
                  setNom('TEST'); 
                  setInitiale('T'); 
                  setPassword('test123'); 
                }}
                className="mt-2 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Remplir avec des données de test
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

