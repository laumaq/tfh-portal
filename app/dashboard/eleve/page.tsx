// app/dashboard/eleve/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; 
import { getJourneesFromSupabase, detecterSessions } from '@/app/dashboard/coordinateur/utils/sessionUtils';

interface EleveInfo {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  problematique: string;
  thematique: string;
  source_1: string;
  source_2: string;
  source_3: string;
  source_4: string;
  source_5: string;
  categorie: string;
  guide_nom: string;
  guide_initiale: string;
  // Sessions dynamiques
  sessions?: Array<{
    index: number;
    nom: string;
    date_debut: Date; 
    statut: string;
  }>;
  defense?: {
    date: string;
    heure: string;
    localisation: string;
    mediateur_nom?: string;
    mediateur_prenom?: string;
    lecteur_interne_nom?: string;
    lecteur_interne_initiale?: string;
    lecteur_externe_nom?: string;
    lecteur_externe_prenom?: string;
  };
  displaySettings?: {
    eleves_voir_guides: boolean;
    eleves_voir_defenses: boolean;
  };
}

export default function EleveDashboard() {
  const [eleve, setEleve] = useState<EleveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [phasePreparatoire, setPhasePreparatoire] = useState(false);
  
  // États pour la problématique
  const [editingProblematique, setEditingProblematique] = useState(false);
  const [newProblematique, setNewProblematique] = useState('');
  
  // États pour la thématique
  const [editingThematique, setEditingThematique] = useState(false);
  const [newThematique, setNewThematique] = useState('');
  
  // États pour les sources
  const [editingSource1, setEditingSource1] = useState(false);
  const [newSource1, setNewSource1] = useState('');
  const [editingSource2, setEditingSource2] = useState(false);
  const [newSource2, setNewSource2] = useState('');
  const [editingSource3, setEditingSource3] = useState(false);
  const [newSource3, setNewSource3] = useState('');
  const [editingSource4, setEditingSource4] = useState(false);
  const [newSource4, setNewSource4] = useState('');
  const [editingSource5, setEditingSource5] = useState(false);
  const [newSource5, setNewSource5] = useState('');
  
  // Objectifs
  const [objectifGeneral, setObjectifGeneral] = useState('');
  const [objectifParticulier, setObjectifParticulier] = useState('');
  const [autorisationModification, setAutorisationModification] = useState(true);
  const [sessions, setSessions] = useState<Array<{
    index: number;
    nom: string;
  }>>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userType = localStorage.getItem('userType');
      const userId = localStorage.getItem('userId');
      
      if (userType !== 'eleve' || !userId) {
        router.push('/');
        return;
      }
      
      loadPhasePreparatoire();
      loadEleve(userId);
    }
  }, [router]);

  const loadPhasePreparatoire = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'phase_preparatoire')
        .single();
      
      if (data) {
        setPhasePreparatoire(data.setting_value === 'true');
      }
    } catch (err) {
      console.error('Erreur chargement phase préparatoire:', err);
    }
  };

  const loadEleve = async (eleveId: string) => {
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select(`
          *,
          guide:guides!guide_id (nom, initiale),
          lecteur_interne:guides!lecteur_interne_id (nom, initiale),
          lecteur_externe:lecteurs_externes!lecteur_externe_id (nom, prenom),
          mediateur:mediateurs!mediateur_id (nom, prenom)
        `)
        .eq('id', eleveId)
        .single();
      
  
      if (error) throw error;
      
      // Charger les sessions séparément
      const journeesData = await getJourneesFromSupabase(supabase);
      const sessionsDetectees = detecterSessions(journeesData);
      
      // Ajouter les sessions aux données élève
      const sessionsAvecDates = sessionsDetectees.map(session => {
        const match = session.id.match(/session_(\d+)/);
        const index = match ? parseInt(match[1]) : 0;
        const columnName = `session_${index}_convoque`;
        const statut = (data as any)[columnName] as string | undefined;
        
        const dateDebut = session.date_debut instanceof Date 
          ? session.date_debut 
          : new Date(session.date_debut);
        
        return {
          index: index,
          nom: session.nom,
          date_debut: dateDebut,
          statut: statut || ''
        };
      });
      
      // Filtrer les sessions à venir
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      
      const sessionsAVenir = sessionsAvecDates.filter(session => 
        session.date_debut >= aujourdhui
      );
      
      // CHARGER D'ABORD LES PARAMÈTRES D'AFFICHAGE
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['eleves_voir_guides', 'eleves_voir_defenses']);
      
      const displaySettings: any = {};
      if (settingsData) {
        settingsData.forEach(setting => {
          displaySettings[setting.setting_key] = setting.setting_value === 'true';
        });
        console.log('Paramètres d\'affichage chargés:', displaySettings);
      }

      // Fonction pour formater l'heure au format xxhyy
      const formatHeure = (heure: string): string => {
        if (!heure) return '';
        
        // Si l'heure est au format HH:MM:SS
        const match = heure.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          const heures = match[1];
          const minutes = match[2];
          return `${heures}h${minutes}`;
        }
        
        // Si c'est déjà dans un autre format, retourner tel quel
        return heure;
      };
      
      // EXTRAIRE LES DONNÉES DE DÉFENSE
      const defenseData = {
        date: data.date_defense || '',
        heure: data.heure_defense ? formatHeure(data.heure_defense) : '',
        localisation: data.localisation_defense || '',
        mediateur_nom: data.mediateur?.nom || '',
        mediateur_prenom: data.mediateur?.prenom || '',
        lecteur_interne_nom: data.lecteur_interne?.nom || '',
        lecteur_interne_initiale: data.lecteur_interne?.initiale || '',
        lecteur_externe_nom: data.lecteur_externe?.nom || '',
        lecteur_externe_prenom: data.lecteur_externe?.prenom || ''
      };
      
      console.log('Données de défense extraites:', defenseData); // Debug
      
      // Formater TOUTES les données en une seule fois
      const eleveFormate: EleveInfo = {
        id: data.id,
        nom: data.nom,
        prenom: data.prenom,
        classe: data.classe,
        problematique: data.problematique || '',
        thematique: data.thematique || '',
        source_1: data.source_1 || '',
        source_2: data.source_2 || '',
        source_3: data.source_3 || '',
        source_4: data.source_4 || '',
        source_5: data.source_5 || '',
        categorie: data.categorie,
        guide_nom: data.guide?.nom || '-',
        guide_initiale: data.guide?.initiale || '-',
        sessions: sessionsAVenir,
        defense: defenseData,
        displaySettings: displaySettings // Inclure directement ici
      };
      
      setEleve(eleveFormate);
      console.log('État élève final:', eleveFormate); // Debug
      
      setNewProblematique(data.problematique || '');
      setNewThematique(data.thematique || '');
      setNewSource1(data.source_1 || '');
      setNewSource2(data.source_2 || '');
      setNewSource3(data.source_3 || '');
      setNewSource4(data.source_4 || '');
      setNewSource5(data.source_5 || '');
      
      // Charger l'objectif général
      const { data: objectifGeneralData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .single();
      
      if (objectifGeneralData) {
        setObjectifGeneral(objectifGeneralData.setting_value || '');
      }
  
      // Charger l'autorisation de modification
      const { data: autorisationData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'autorisation_modification_problematique')
        .single();
      
      if (autorisationData) {
        setAutorisationModification(autorisationData.setting_value === 'true');
      }
      
      // Objectif particulier
      setObjectifParticulier(data.objectif_particulier || '');
      
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

  const handleSaveThematique = async () => {
    if (!eleve) return;

    try {
      await supabase
        .from('eleves')
        .update({ thematique: newThematique })
        .eq('id', eleve.id);

      loadEleve(eleve.id);
      setEditingThematique(false);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const handleSaveSource = async (sourceField: string, value: string) => {
    if (!eleve) return;

    try {
      await supabase
        .from('eleves')
        .update({ [sourceField]: value })
        .eq('id', eleve.id);

      loadEleve(eleve.id);
      
      // Désactiver l'édition pour ce champ
      switch(sourceField) {
        case 'source_1': setEditingSource1(false); break;
        case 'source_2': setEditingSource2(false); break;
        case 'source_3': setEditingSource3(false); break;
        case 'source_4': setEditingSource4(false); break;
        case 'source_5': setEditingSource5(false); break;
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const getMessagePourEleve = (statut: string): string => {
    switch (statut) {
      case 'Oui, l\'élève n\'a pas communiqué':
        return 'Tu es convoqué·e car tu n\'as pas communiqué (ou pas assez) selon ton/ta guide.';
      case 'Oui, l\'élève n\'a pas avancé':
        return 'Tu es convoqué·e car tu n\'as pas avancé (ou sensiblement pas) selon ton/ta guide.';
      case 'Oui, l\'élève n\'atteint pas les objectifs':
        return 'Tu es convoqué·e car tu as avancé mais n\'atteins pas les objectifs.';
      case 'Non, l\'élève atteint bien les objectifs':
        return 'Tu n\'es pas convoqué·e.';
      case '':
        return 'Ton guide n'a pas rendu d'info. Nous considérons donc que tu n'es pas convoqué.';
      case null:
        return 'Ton guide n'a pas rendu d'info. Nous considérons donc que tu n'es pas convoqué.';
      case undefined:
        return 'Statut non défini.';
      default:
        return statut;
    }
  };

  const DefenseSection = ({ eleve }: { eleve: EleveInfo }) => {
    // Ajoutez des logs pour déboguer
    console.log('DefenseSection - displaySettings:', eleve.displaySettings);
    console.log('DefenseSection - defense:', eleve.defense);
    console.log('DefenseSection - date défense:', eleve.defense?.date);
    
    if (!eleve.displaySettings?.eleves_voir_defenses) {
      console.log('DefenseSection: masqué car eleves_voir_defenses = false');
      return null;
    }
    
    if (!eleve.defense || !eleve.defense.date) {
      console.log('DefenseSection: masqué car pas de données de défense');
      return null;
    }
  
    return (
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⚖️</span>
          <h3 className="text-lg font-semibold text-gray-700">Ma défense TFH</h3>
          {eleve.defense.date && (
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              À venir
            </span>
          )}
        </div>
  
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date et heure */}
            {eleve.defense.date && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <span className="text-purple-500 text-xl">📅</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Date et heure</p>
                  <p className="text-gray-800">
                    {new Date(eleve.defense.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {eleve.defense.heure && ` à ${eleve.defense.heure}`}
                  </p>
                </div>
              </div>
            )}
  
            {/* Localisation */}
            {eleve.defense.localisation && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <span className="text-purple-500 text-xl">📍</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Lieu</p>
                  <p className="text-gray-800">{eleve.defense.localisation}</p>
                </div>
              </div>
            )}
  
            {/* Médiateur */}
            {eleve.displaySettings?.eleves_voir_guides && eleve.defense.mediateur_nom && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <span className="text-purple-500 text-xl">⚖️</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Médiateur·trice</p>
                  <p className="text-gray-800">
                    {eleve.defense.mediateur_prenom} {eleve.defense.mediateur_nom}
                  </p>
                </div>
              </div>
            )}
  
            {/* Lecteur interne */}
            {eleve.defense.lecteur_interne_nom && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <span className="text-purple-500 text-xl">📖</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Lecteur·rice interne</p>
                  <p className="text-gray-800">
                    {eleve.defense.lecteur_interne_nom} {eleve.defense.lecteur_interne_initiale}.
                  </p>
                </div>
              </div>
            )}
  
            {/* Lecteur externe */}
            {eleve.defense.lecteur_externe_nom && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <span className="text-purple-500 text-xl">👁️</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Lecteur·rice externe</p>
                  <p className="text-gray-800">
                    {eleve.defense.lecteur_externe_prenom} {eleve.defense.lecteur_externe_nom}
                  </p>
                </div>
              </div>
            )}
          </div>
  
          {/* Message si pas de défense programmée */}
          {!eleve.defense.date && (
            <div className="text-center py-4">
              <p className="text-gray-500">Aucune défense programmée pour le moment.</p>
              <p className="text-sm text-gray-400 mt-1">
                Les informations apparaîtront ici quand une date sera fixée.
              </p>
            </div>
          )}
        </div>
      </div>
    );
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
          {/* Dans la section des informations de l'élève */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {eleve.prenom} {eleve.nom}
            </h2>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Classe:</span> {eleve.classe}</p>
              
              {/* Afficher le guide uniquement si autorisé */}
              {eleve.displaySettings?.eleves_voir_guides && (
                <p><span className="font-medium">Guide:</span> {eleve.guide_nom} {eleve.guide_initiale}.</p>
              )}
              
              {eleve.categorie && (
                <p><span className="font-medium">Catégorie:</span> {eleve.categorie}</p>
              )}
              {phasePreparatoire && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🚧 Phase préparatoire
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION THÉMATIQUE (affichée en premier en phase préparatoire) */}
          {phasePreparatoire && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-700">Thématique</h3>
                {!editingThematique && autorisationModification && (
                  <button
                    onClick={() => setEditingThematique(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {eleve.thematique ? 'Modifier' : 'Ajouter'}
                  </button>
                )}
              </div>
              
              {editingThematique ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newThematique}
                    onChange={(e) => setNewThematique(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Transition écologique, Intelligence artificielle, Inégalités sociales..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveThematique}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingThematique(false);
                        setNewThematique(eleve.thematique || '');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  {eleve.thematique || (
                    <span className="text-gray-400 italic">Aucune thématique définie</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section Défense */}
          <DefenseSection eleve={eleve} />

          {/* SECTION PROBLÉMATIQUE */}
          <div className={`${phasePreparatoire ? '' : 'border-t'} pt-6`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Problématique</h3>
              {!editingProblematique && (
                autorisationModification ? (
                  <button
                    onClick={() => setEditingProblematique(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {eleve.problematique ? 'Modifier' : 'Ajouter'}
                  </button>
                ) : (
                  <span className="text-sm text-gray-400 italic flex items-center gap-1">
                    <span className="text-xs">🔒</span>
                    Demandez à un coordinateur pour modifier
                  </span>
                )
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

          {/* SECTION SOURCES (phase préparatoire uniquement) */}
          {phasePreparatoire && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Sources documentaires</h3>
              <div className="space-y-4">
                {/* Source 1 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600">Source 1</label>
                    {!editingSource1 && autorisationModification && (
                      <button
                        onClick={() => setEditingSource1(true)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {eleve.source_1 ? 'Modifier' : 'Ajouter'}
                      </button>
                    )}
                  </div>
                  {editingSource1 ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSource1}
                        onChange={(e) => setNewSource1(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Titre de la source, lien, référence..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveSource('source_1', newSource1)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setEditingSource1(false);
                            setNewSource1(eleve.source_1 || '');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      {eleve.source_1 || <span className="text-gray-400 italic">Aucune source</span>}
                    </div>
                  )}
                </div>

                {/* Source 2 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600">Source 2</label>
                    {!editingSource2 && autorisationModification && (
                      <button
                        onClick={() => setEditingSource2(true)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {eleve.source_2 ? 'Modifier' : 'Ajouter'}
                      </button>
                    )}
                  </div>
                  {editingSource2 ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSource2}
                        onChange={(e) => setNewSource2(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Titre de la source, lien, référence..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveSource('source_2', newSource2)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setEditingSource2(false);
                            setNewSource2(eleve.source_2 || '');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      {eleve.source_2 || <span className="text-gray-400 italic">Aucune source</span>}
                    </div>
                  )}
                </div>

                {/* Source 3 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600">Source 3</label>
                    {!editingSource3 && autorisationModification && (
                      <button
                        onClick={() => setEditingSource3(true)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {eleve.source_3 ? 'Modifier' : 'Ajouter'}
                      </button>
                    )}
                  </div>
                  {editingSource3 ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSource3}
                        onChange={(e) => setNewSource3(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Titre de la source, lien, référence..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveSource('source_3', newSource3)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setEditingSource3(false);
                            setNewSource3(eleve.source_3 || '');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      {eleve.source_3 || <span className="text-gray-400 italic">Aucune source</span>}
                    </div>
                  )}
                </div>

                {/* Source 4 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600">Source 4</label>
                    {!editingSource4 && autorisationModification && (
                      <button
                        onClick={() => setEditingSource4(true)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {eleve.source_4 ? 'Modifier' : 'Ajouter'}
                      </button>
                    )}
                  </div>
                  {editingSource4 ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSource4}
                        onChange={(e) => setNewSource4(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Titre de la source, lien, référence..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveSource('source_4', newSource4)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setEditingSource4(false);
                            setNewSource4(eleve.source_4 || '');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      {eleve.source_4 || <span className="text-gray-400 italic">Aucune source</span>}
                    </div>
                  )}
                </div>

                {/* Source 5 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600">Source 5</label>
                    {!editingSource5 && autorisationModification && (
                      <button
                        onClick={() => setEditingSource5(true)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {eleve.source_5 ? 'Modifier' : 'Ajouter'}
                      </button>
                    )}
                  </div>
                  {editingSource5 ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSource5}
                        onChange={(e) => setNewSource5(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Titre de la source, lien, référence..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveSource('source_5', newSource5)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setEditingSource5(false);
                            setNewSource5(eleve.source_5 || '');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      {eleve.source_5 || <span className="text-gray-400 italic">Aucune source</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION CONVOCATIONS (masquée en phase préparatoire) */}
          {!phasePreparatoire && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Convocations à venir</h3>
              <div className="space-y-4">
                {eleve.sessions && eleve.sessions.length > 0 ? (
                  eleve.sessions.map(session => {
                    const statut = session.statut || '';
                    const estConvoque = statut.startsWith('Oui');
                    const message = getMessagePourEleve(statut);
                    
                    return (
                      <div key={session.index} className="border rounded-lg overflow-hidden">
                        <div className={`flex justify-between items-center p-3 ${estConvoque ? 'bg-orange-50' : 'bg-gray-50'}`}>
                          <div>
                            <span className="font-medium">{session.nom}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({session.date_debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })})
                            </span>
                          </div>
                          <span className={
                            estConvoque 
                              ? 'text-orange-600 font-medium' 
                              : statut.startsWith('Non')
                              ? 'text-green-600 font-medium'
                              : 'text-gray-500'
                          }>
                            {estConvoque ? 'Convoqué·e' : statut.startsWith('Non') ? 'Non convoqué·e' : '—'}
                          </span>
                        </div>
                        
                        {statut && statut !== '' && !statut.startsWith('Non') && (
                          <div className="p-3 border-t bg-white">
                            <p className="text-sm text-gray-700">
                              {message}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <p className="mb-2">Aucune session à venir planifiée.</p>
                    <p className="text-sm">Tes prochaines convocations apparaîtront ici.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Objectif Général */}
          {objectifGeneral && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <h3 className="text-lg font-semibold text-gray-700">Objectif général du TFH</h3>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <span className="text-blue-500 text-xl">📋</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {objectifGeneral}
                    </p>
                    <p className="text-sm text-blue-600 mt-3 font-medium">
                      Cet objectif s'applique à tous les élèves.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Section Objectif Particulier */}
          {objectifParticulier && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⭐</span>
                <h3 className="text-lg font-semibold text-gray-700">Objectif particulier pour vous</h3>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <span className="text-green-500 text-xl">✨</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {objectifParticulier}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Défini par ton/ta guide
                      </span>
                      <span className="text-xs text-green-600">
                        {eleve.guide_nom} {eleve.guide_initiale}.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Message si aucun objectif particulier */}
          {!objectifParticulier && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⭐</span>
                <h3 className="text-lg font-semibold text-gray-700">Objectif particulier</h3>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-5 border border-gray-100">
                <div className="text-center py-4">
                  <span className="text-3xl mb-3 block">🤔</span>
                  <p className="text-gray-600 mb-2">
                    Ton/ta guide n'a pas encore défini d'objectif particulier pour toi.
                  </p>
                  <p className="text-sm text-gray-500">
                    Cet objectif sera personnalisé selon tes besoins spécifiques.
                  </p>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}










