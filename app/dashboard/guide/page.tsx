'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface EleveInfo {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  categorie: string;
  guide_nom: string;
  guide_initiale: string;
  convocation_mars: string;
  convocation_avril: string;
}

export default function EleveDashboard() {
  const [eleve, setEleve] = useState<EleveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProblematique, setEditingProblematique] = useState(false);
  const [newProblematique, setNewProblematique] = useState('');
  const [showFullProblematique, setShowFullProblematique] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const router = useRouter();

  // Options de convocation avec couleurs
  const CONVOCATION_OPTIONS = [
    { value: '', label: 'Non défini', color: 'bg-gray-100 text-gray-600' },
    { 
      value: 'Non, l\'élève atteint bien les objectifs', 
      label: 'Non, atteint les objectifs',
      shortLabel: 'Objectifs atteints',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    { 
      value: 'Oui, l\'élève n\'atteint pas les objectifs', 
      label: 'Oui, n\'atteint pas les objectifs',
      shortLabel: 'Objectifs non atteints',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    { 
      value: 'Oui, n\'a pas avancé', 
      label: 'Oui, n\'a pas avancé',
      shortLabel: 'Pas avancé',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    { 
      value: 'Oui n\'a pas communiqué', 
      label: 'Oui, n\'a pas communiqué',
      shortLabel: 'Pas communiqué',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    }
  ];

  // Fonction pour forcer le mode paysage sur mobile
  const checkAndForceLandscape = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && !isLandscape) {
        setIsLandscape(true);
        // Afficher une instruction pour pivoter
        const landscapeMsg = document.getElementById('landscape-message');
        if (landscapeMsg) {
          landscapeMsg.classList.remove('hidden');
        }
      } else {
        setIsLandscape(false);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      
      if (userType !== 'eleve' || !userId) {
        router.push('/');
        return;
      }
      
      loadEleve(userId);
      
      // Vérifier l'orientation au chargement
      checkAndForceLandscape();
      
      // Ajouter des écouteurs pour le redimensionnement
      window.addEventListener('resize', checkAndForceLandscape);
      window.addEventListener('orientationchange', checkAndForceLandscape);
      
      return () => {
        window.removeEventListener('resize', checkAndForceLandscape);
        window.removeEventListener('orientationchange', checkAndForceLandscape);
      };
    }
  }, [router]);

  const loadEleve = async (eleveId: string) => {
    try {
      const { data, error } = await supabase
        .from('vue_eleves_complete')
        .select('*')
        .eq('id', eleveId)
        .single();

      if (error) throw error;
      setEleve(data);
      setNewProblematique(data.problematique || '');
    } catch (err) {
      console.error('Erreur chargement élève:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProblematique = async () => {
    if (!eleve) return;

    try {
      await supabase
        .from('eleves')
        .update({ problematique: newProblematique })
        .eq('id', eleve.id);

      loadEleve(eleve.id);
      setEditingProblematique(false);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    router.push('/');
  };

  // Fonction pour obtenir les infos de convocation
  const getConvocationInfo = (value: string | null) => {
    if (!value) {
      return CONVOCATION_OPTIONS[0];
    }
    const option = CONVOCATION_OPTIONS.find(opt => opt.value === value);
    return option || CONVOCATION_OPTIONS[0];
  };

  // Fonction pour tronquer le texte si nécessaire
  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!eleve) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Élève non trouvé</div>
      </div>
    );
  }

  const convocationMars = getConvocationInfo(eleve.convocation_mars);
  const convocationAvril = getConvocationInfo(eleve.convocation_avril);
  const problematiqueText = eleve.problematique || 'Aucune problématique définie';
  const shouldTruncateProblematique = problematiqueText.length > 200 && !showFullProblematique;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      {/* Message pour le mode paysage sur mobile */}
      <div 
        id="landscape-message" 
        className="hidden fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-lg p-6 max-w-sm text-center">
          <div className="text-4xl mb-4">↻</div>
          <h3 className="text-lg font-semibold mb-2">Pivotez votre appareil</h3>
          <p className="text-gray-600 mb-4">
            Pour une meilleure expérience, veuillez utiliser votre téléphone en mode paysage.
          </p>
          <button
            onClick={() => {
              const msg = document.getElementById('landscape-message');
              if (msg) msg.classList.add('hidden');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            J'ai compris
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Mon TFH</h1>
            <p className="text-gray-600 mt-1">Tableau de suivi personnel</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm md:text-base"
          >
            Déconnexion
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Informations de base */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                {eleve.prenom.charAt(0)}{eleve.nom.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                  {eleve.prenom} {eleve.nom}
                </h2>
                <div className="flex flex-wrap gap-2 md:gap-4 text-sm md:text-base text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Classe:</span> {eleve.classe}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Guide:</span> {eleve.guide_nom} {eleve.guide_initiale}.
                  </span>
                  {eleve.categorie && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Catégorie:</span> {eleve.categorie}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Problématique */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg md:text-xl font-semibold text-gray-700 flex items-center gap-2">
                <span>Problématique</span>
                {eleve.problematique && (
                  <span className="text-xs font-normal text-gray-500">
                    ({problematiqueText.length} caractères)
                  </span>
                )}
              </h3>
              {!editingProblematique && (
                <button
                  onClick={() => setEditingProblematique(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Modifier
                </button>
              )}
            </div>
            
            {editingProblematique ? (
              <div className="space-y-4">
                <textarea
                  value={newProblematique}
                  onChange={(e) => setNewProblematique(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 md:p-4 min-h-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                  placeholder="Décrivez votre problématique ici..."
                  rows={6}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSaveProblematique}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setEditingProblematique(false);
                      setNewProblematique(eleve?.problematique || '');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div 
                  className={`bg-gray-50 rounded-lg p-4 md:p-6 whitespace-pre-wrap break-words text-sm md:text-base ${
                    shouldTruncateProblematique ? 'max-h-48 overflow-hidden' : ''
                  }`}
                >
                  {shouldTruncateProblematique 
                    ? truncateText(problematiqueText, 200)
                    : problematiqueText}
                </div>
                
                {problematiqueText.length > 200 && (
                  <button
                    onClick={() => setShowFullProblematique(!showFullProblematique)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showFullProblematique ? 'Voir moins' : 'Voir plus...'}
                  </button>
                )}
                
                {!problematiqueText && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>Aucune problématique définie</p>
                    <p className="text-sm mt-1">Cliquez sur "Modifier" pour ajouter votre problématique</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Convocations */}
          <div className="border-t pt-6">
            <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4 md:mb-6">
              État des convocations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Mars */}
              <div className={`rounded-xl p-4 md:p-6 border ${convocationMars.color} transition-all hover:shadow-md`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-800 text-lg">9-10 mars</h4>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${convocationMars.color.includes('green') ? 'bg-green-200 text-green-900' : 
                    convocationMars.color.includes('yellow') ? 'bg-yellow-200 text-yellow-900' :
                    convocationMars.color.includes('red') ? 'bg-red-200 text-red-900' :
                    convocationMars.color.includes('orange') ? 'bg-orange-200 text-orange-900' :
                    'bg-gray-200 text-gray-900'}`}>
                    {convocationMars.value?.startsWith('Oui') ? 'CONVOQUÉ' : 
                     convocationMars.value?.startsWith('Non') ? 'NON CONVOQUÉ' : 'À DÉFINIR'}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm md:text-base">
                    <span className="font-medium">Statut:</span>{' '}
                    <span className={`font-medium ${convocationMars.color.split(' ')[1]}`}>
                      {convocationMars.label}
                    </span>
                  </p>
                  
                  {convocationMars.value && (
                    <div className="bg-white bg-opacity-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        {convocationMars.value}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Avril */}
              <div className={`rounded-xl p-4 md:p-6 border ${convocationAvril.color} transition-all hover:shadow-md`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-800 text-lg">16-17 avril</h4>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${convocationAvril.color.includes('green') ? 'bg-green-200 text-green-900' : 
                    convocationAvril.color.includes('yellow') ? 'bg-yellow-200 text-yellow-900' :
                    convocationAvril.color.includes('red') ? 'bg-red-200 text-red-900' :
                    convocationAvril.color.includes('orange') ? 'bg-orange-200 text-orange-900' :
                    'bg-gray-200 text-gray-900'}`}>
                    {convocationAvril.value?.startsWith('Oui') ? 'CONVOQUÉ' : 
                     convocationAvril.value?.startsWith('Non') ? 'NON CONVOQUÉ' : 'À DÉFINIR'}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm md:text-base">
                    <span className="font-medium">Statut:</span>{' '}
                    <span className={`font-medium ${convocationAvril.color.split(' ')[1]}`}>
                      {convocationAvril.label}
                    </span>
                  </p>
                  
                  {convocationAvril.value && (
                    <div className="bg-white bg-opacity-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        {convocationAvril.value}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Légende des couleurs */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Légende des couleurs:</p>
              <div className="flex flex-wrap gap-2">
                {CONVOCATION_OPTIONS.filter(opt => opt.value).map((opt) => (
                  <div key={opt.value} className={`${opt.color} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                    <div className="w-2 h-2 rounded-full" style={{
                      backgroundColor: opt.color.includes('green') ? '#10B981' :
                                     opt.color.includes('yellow') ? '#F59E0B' :
                                     opt.color.includes('orange') ? '#F97316' :
                                     opt.color.includes('red') ? '#EF4444' : '#6B7280'
                    }}></div>
                    {opt.shortLabel || opt.label.split(',')[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Note pour les utilisateurs mobiles */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 md:hidden">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <span className="text-lg">💡</span>
            Pour une meilleure lecture, pivotez votre appareil en mode paysage.
          </p>
        </div>
      </div>
    </div>
  );
}
