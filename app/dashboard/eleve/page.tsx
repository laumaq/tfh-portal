'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // <-- CORRECTION : Import unique

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
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      
      if (userType !== 'eleve' || !userId) {
        router.push('/');
        return;
      }
      
      loadEleve(userId);
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!eleve) {
    return <div className="min-h-screen flex items-center justify-center">Élève non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Mon TFH</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {eleve.prenom} {eleve.nom}
            </h2>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Classe:</span> {eleve.classe}</p>
              <p><span className="font-medium">Guide:</span> {eleve.guide_nom} {eleve.guide_initiale}.</p>
              {eleve.categorie && (
                <p><span className="font-medium">Catégorie:</span> {eleve.categorie}</p>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Problématique</h3>
              {!editingProblematique && (
                <button
                  onClick={() => setEditingProblematique(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Modifier
                </button>
              )}
            </div>
            
            {editingProblematique ? (
              <div className="space-y-3">
                <textarea
                  value={newProblematique}
                  onChange={(e) => setNewProblematique(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[150px] focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez votre problématique..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProblematique}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setEditingProblematique(false);
                      setNewProblematique(eleve.problematique || '');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                {eleve.problematique || 'Aucune problématique définie'}
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Convocations</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">9-10 mars:</span>
                <span className={
                  eleve.convocation_mars?.startsWith('Oui') 
                    ? 'text-orange-600 font-medium' 
                    : eleve.convocation_mars?.startsWith('Non')
                    ? 'text-green-600'
                    : 'text-gray-500'
                }>
                  {eleve.convocation_mars || 'Non défini'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">16-17 avril:</span>
                <span className={
                  eleve.convocation_avril?.startsWith('Oui') 
                    ? 'text-orange-600 font-medium' 
                    : eleve.convocation_avril?.startsWith('Non')
                    ? 'text-green-600'
                    : 'text-gray-500'
                }>
                  {eleve.convocation_avril || 'Non défini'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

