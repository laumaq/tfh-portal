// app/connexion-lecteur-externe/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import logo from '@/app/components/Logotypebaseline_NB.png';

export default function LoginLecteurExternePage() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const router = useRouter();

  // Fonction pour formater le prénom (majuscule initiale, reste en minuscule)
  const formatPrenom = (prenom: string): string => {
    const trimmed = prenom.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  // Vérifier si l'utilisateur existe déjà
  const checkExistingUser = async () => {
    if (!nom.trim() || !prenom.trim()) return;

    const nomNormalized = nom.trim().toUpperCase();
    const prenomNormalized = prenom.trim().toUpperCase(); // Pour la recherche, on met en majuscules

    try {
      const { data: lecteurData, error: lecteurError } = await supabase
        .from('lecteurs_externes')
        .select('id, email, telephone, mot_de_passe')
        .ilike('nom', nomNormalized)
        .ilike('prenom', prenomNormalized + '%')
        .maybeSingle();

      if (!lecteurError && lecteurData) {
        setIsNewUser(false);
        return lecteurData;
      } else {
        setIsNewUser(true);
        return null;
      }
    } catch (err) {
      console.error('Erreur vérification:', err);
      setIsNewUser(true);
      return null;
    }
  };

  // Gérer la soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Pour la recherche/connexion : majuscules et trim
    const nomNormalized = nom.trim().toUpperCase();
    const prenomForSearch = prenom.trim().toUpperCase();

    try {
      // 1. VÉRIFICATION UTILISATEUR EXISTANT
      const { data: existingUser, error: checkError } = await supabase
        .from('lecteurs_externes')
        .select('id, email, mot_de_passe')
        .ilike('nom', nomNormalized)
        .ilike('prenom', prenomForSearch + '%')
        .maybeSingle();

      if (!checkError && existingUser) {
        // CONNEXION UTILISATEUR EXISTANT
        const storedPassword = existingUser.mot_de_passe;

        // Première connexion (pas de mot de passe)
        if (!storedPassword || storedPassword === '') {
          if (!password.trim()) {
            setError('Veuillez créer un mot de passe pour votre première connexion');
            setLoading(false);
            return;
          }

          const { error: updateError } = await supabase
            .from('lecteurs_externes')
            .update({ mot_de_passe: password })
            .eq('id', existingUser.id);

          if (updateError) throw updateError;
        } else {
          // Vérifier le mot de passe
          if (storedPassword !== password) {
            setError('Mot de passe incorrect');
            setLoading(false);
            return;
          }
        }

        // Connexion réussie
        localStorage.setItem('userType', 'lecteur_externe');
        localStorage.setItem('userId', existingUser.id);
        // On garde l'affichage original du nom/prénom
        const userData = await supabase
          .from('lecteurs_externes')
          .select('nom, prenom')
          .eq('id', existingUser.id)
          .single();
        
        if (userData.data) {
          localStorage.setItem('userName', `${userData.data.prenom} ${userData.data.nom}`);
        } else {
          localStorage.setItem('userName', `${formatPrenom(prenom)} ${nomNormalized}`);
        }
        
        router.push('/dashboard/lecteur_externe');
        return;
      }

      // 2. NOUVEL UTILISATEUR - VÉRIFICATION EMAIL
      if (!email.trim()) {
        setError('L\'email est obligatoire pour les nouveaux lecteurs externes');
        setLoading(false);
        return;
      }

      // Vérifier si l'email existe déjà
      const { data: emailCheck } = await supabase
        .from('lecteurs_externes')
        .select('id')
        .ilike('email', email.trim())
        .maybeSingle();

      if (emailCheck) {
        setError('Cet email est déjà enregistré. Utilisez la connexion standard.');
        setLoading(false);
        return;
      }

      // 3. CRÉATION DU NOUVEAU LECTEUR EXTERNE
      // Ici on garde la casse originale formatée (majuscule initiale)
      const prenomFormatted = formatPrenom(prenom);
      const emailTrimmed = email.trim();
      const telephoneTrimmed = telephone.trim() || null;

      const { data: newLecteur, error: insertError } = await supabase
        .from('lecteurs_externes')
        .insert([
          {
            nom: nomNormalized, // Nom en majuscules pour uniformité
            prenom: prenomFormatted, // Prénom formaté (majuscule initiale)
            email: emailTrimmed,
            telephone: telephoneTrimmed,
            mot_de_passe: password || null,
            created_at: new Date().toISOString()  
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Connexion automatique
      localStorage.setItem('userType', 'lecteur_externe');
      localStorage.setItem('userId', newLecteur.id);
      localStorage.setItem('userName', `${prenomFormatted} ${nomNormalized}`);
      
      // Redirection avec message de bienvenue
      setWelcomeMessage('Bienvenue ! Votre compte a été créé avec succès \n \n Merci de prendre du temps pour nos rhétos !');
      setShowWelcome(true);

      setTimeout(() => {
        router.push('/dashboard/lecteur_externe');
      }, 6000);

    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // Vérifier automatiquement quand les champs sont remplis
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (nom.trim() && prenom.trim()) {
        checkExistingUser();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [nom, prenom]);

  // JSX avec nettoyage en temps réel dans les inputs
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <Image
                src={logo}
                alt="Logo de l'école"
                className="h-auto max-w-[400px] object-contain"
                priority
              />
            </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Connexion Lecteur Externe
          </h1>
          <p className="text-gray-600">
            Portail dédié aux évaluateurs externes des TFH
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom et Prénom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                onBlur={(e) => setNom(e.target.value.trim())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoComplete="family-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                onBlur={(e) => {
                  // Formatage visuel pour l'utilisateur
                  const formatted = formatPrenom(e.target.value);
                  setPrenom(formatted);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoComplete="given-name"
              />
            </div>
          </div>

          {/* Indicateur Nouveau/Existant */}
          {isNewUser !== null && (
            <div className={`p-3 rounded-lg text-sm ${isNewUser ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
              {isNewUser ? (
                <>Nouveau lecteur détecté. Veuillez compléter les informations ci-dessous.</>
              ) : (
                <>Lecteur existant détecté. Connectez-vous avec votre mot de passe.</>
              )}
            </div>
          )}

          {/* Champs conditionnels pour nouveaux utilisateurs */}
          {isNewUser === true && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                  <span className="text-xs text-gray-500 ml-1">(obligatoire pour les nouveaux)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => setEmail(e.target.value.trim())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={isNewUser}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                  <span className="text-xs text-gray-500 ml-1">(facultatif)</span>
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  onBlur={(e) => setTelephone(e.target.value.trim())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="tel"
                />
              </div>
            </>
          )}

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe *
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
              {isNewUser 
                ? 'Ce mot de passe vous servira pour vos prochaines connexions'
                : 'À la première connexion, ce mot de passe sera enregistré'}
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className={`p-3 rounded-lg text-sm ${error.includes('incorrect') ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
              {error}
            </div>
          )}

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Traitement en cours...' : 
             isNewUser ? 'Créer mon compte et me connecter' : 'Se connecter'}
          </button>

          {/* Lien vers la connexion normale */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Vous êtes coordinateur, guide, élève ou médiateur ?{' '}
              <a 
                href="/" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Utilisez la connexion standard
              </a>
            </p>
          </div>
        </form>

        {showWelcome && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Compte créé avec succès !</h3>
                <p className="text-gray-600 mb-4 whitespace-pre-line">{welcomeMessage}</p>
                <p className="text-sm text-gray-500 mb-6">
                  Redirection automatique vers votre dashboard dans 6 secondes...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-progress"></div>
                </div>
                <button
                  onClick={() => router.push('/dashboard/lecteur_externe')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Aller maintenant →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section informations */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Informations importantes :</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Les lecteurs externes peuvent créer leur compte eux-mêmes</li>
              <li>• L'email est obligatoire pour la création de compte</li>
              <li>• Si vous avez oublié votre mot de passe, contactez un coordinateur</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
