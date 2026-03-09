{/* Section des autorisations */}
<div className="border border-blue-200 rounded-lg p-6 mb-4">
  <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">🚦</span>
    Autorisations
  </h4>
  
  <div className="space-y-4">
    {/* Toggle 1 : Lecteur interne */}
    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
      <div>
        <h5 className="font-medium text-gray-800 mb-1">Onglet "Lecteur interne" pour les guides</h5>
        <p className="text-sm text-gray-600 mt-1">
          Autorise les guides à sélectionner des TFH en tant que lecteur interne
        </p>
      </div>
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={lecteurInterneEnabled}
            onChange={(e) => toggleLecteurInterne(e.target.checked)}
            disabled={loadingSettings}
          />
          <div className={`block w-14 h-8 rounded-full ${lecteurInterneEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${lecteurInterneEnabled ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <span className="ml-3 text-sm font-medium text-gray-700">
          {lecteurInterneEnabled ? 'Activé' : 'Désactivé'}
        </span>
      </label>
    </div>

    {/* Toggle 2 : Modification problématique */}
    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
      <div>
        <h5 className="font-medium text-gray-800 mb-1">Modification des problématiques par les élèves</h5>
        <p className="text-sm text-gray-600 mt-1">
          Autorise les élèves à modifier leur problématique de recherche
        </p>
      </div>
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={displaySettings.autorisation_modification_problematique}
            onChange={(e) => saveDisplaySetting('autorisation_modification_problematique', e.target.checked)}
            disabled={loadingSettings}
          />
          <div className={`block w-14 h-8 rounded-full ${displaySettings.autorisation_modification_problematique ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${displaySettings.autorisation_modification_problematique ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <span className="ml-3 text-sm font-medium text-gray-700">
          {displaySettings.autorisation_modification_problematique ? 'Activé' : 'Désactivé'}
        </span>
      </label>
    </div>

    {/* Toggle 3 : Phase préparatoire - NOUVEAU */}
    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg mt-4">
      <div>
        <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
          <span className="text-lg">🚧</span>
          Phase préparatoire globale
        </h5>
        <p className="text-sm text-gray-600 mt-1">
          Activez cette option pour tous les élèves :
          <span className="block mt-1 text-xs">
            • La thématique s'affiche avant la problématique
            <br />• 5 champs de sources documentaires apparaissent
            <br />• Les convocations sont masquées
            <br />• Un badge "Phase préparatoire" s'affiche
          </span>
        </p>
      </div>
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={phasePreparatoireEnabled}
            onChange={(e) => togglePhasePreparatoire(e.target.checked)}
            disabled={loadingSettings}
          />
          <div className={`block w-14 h-8 rounded-full ${phasePreparatoireEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
          <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${phasePreparatoireEnabled ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <span className="ml-3 text-sm font-medium text-gray-700">
          {phasePreparatoireEnabled ? 'Activée' : 'Désactivée'}
        </span>
      </label>
    </div>
  </div>
</div>
