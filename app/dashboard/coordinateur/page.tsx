// CAS 1: NULL = première connexion
if (storedPassword === null) {
  console.log("Tentative d'enregistrement du mot de passe pour:", coordData.id);
  
  const { error: updateError } = await supabase
    .from('coordinateurs')
    .update({ mot_de_passe: password })
    .eq('id', coordData.id);
  
  // VÉRIFICATION CRUCIALE
  if (updateError) {
    console.error("ÉCHEC de l'UPDATE du mot de passe:", updateError);
    setError(`Erreur technique: ${updateError.message}`);
    setLoading(false);
    return;
  }
  
  console.log("Mot de passe enregistré avec succès");
  
  localStorage.setItem('userType', 'coordinateur');
  localStorage.setItem('userId', coordData.id);
  localStorage.setItem('userName', `${coordData.nom} ${coordData.initiale}.`);
  router.push('/dashboard/coordinateur');
  return;
}
