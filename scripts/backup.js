async function createBackup() {
  try {
    console.log('=== DÉBUT DU BACKUP ===');
    console.log('1. Vérification des variables d\'environnement...');
    
    // Vérifiez les variables
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Défini' : '❌ Manquant');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Défini' : '❌ Manquant');
    console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '✅ Défini' : '❌ Manquant');
    
    // Test de connexion rapide à Supabase
    console.log('2. Test de connexion à Supabase...');
    try {
      const testResult = await supabase.from('eleves').select('*').limit(1);
      if (testResult.error) {
        console.log('❌ Erreur Supabase:', testResult.error.message);
      } else {
        console.log(`✅ Connexion OK! ${testResult.data?.length || 0} élève(s) trouvé(s)`);
      }
    } catch (supabaseError) {
      console.log('❌ Exception Supabase:', supabaseError.message);
    }
    
    console.log('3. Début de l\'export des tables...');    

// 11. Pousser sur GitHub (version nouveau token)
async function pushToGitHub(filePath, fileName) {
  try {
    console.log('🐙 Pushing to GitHub...');
    
    const token = process.env.GITHUB_TOKEN;
    const username = process.env.GITHUB_USERNAME || 'laumaq';
    const repo = process.env.GITHUB_REPO || 'tfh-portal';
    
    // Lire le contenu du fichier
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Encodage base64 pour GitHub API
    const contentBase64 = Buffer.from(fileContent).toString('base64');
    
    // URL de l'API GitHub
    const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/backups/${fileName}`;
    
    // Headers pour le nouveau token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'TFH-Backup-Bot'
    };
    
    // 1. Vérifier si le fichier existe déjà
    let sha = null;
    try {
      const checkResponse = await fetch(apiUrl, { headers });
      
      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        sha = existingFile.sha;
        console.log('📝 Mise à jour du fichier existant');
      }
    } catch (e) {
      // Fichier n'existe pas encore
    }
    
    // 2. Corps de la requête
    const body = {
      message: `📦 Backup automatique ${new Date().toLocaleDateString('fr-FR')}`,
      content: contentBase64,
      ...(sha && { sha }) // Inclure SHA si mise à jour
    };
    
    // 3. Envoyer la requête
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Backup poussé sur GitHub avec succès !');
      console.log(`🔗 ${result.content.html_url}`);
    } else {
      const error = await response.json();
      console.log('⚠️ Erreur GitHub:', error.message || 'Unknown error');
    }
    
  } catch (error) {
    console.log('⚠️ Impossible de pousser sur GitHub:', error.message);
    console.log('💡 Le backup local est toujours disponible');
  }
}
