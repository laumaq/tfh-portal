// scripts/backup.js
// 📦 SCRIPT DE BACKUP POUR SUPABASE -> GITHUB
// 🎯 À exécuter manuellement ou automatiquement

// 1. Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

console.log('🚀 Démarrage du backup...');

// 2. Vérifier les variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Variable manquante: ${varName}`);
    console.log(`💡 Ajoutez-la dans scripts/.env.local`);
    process.exit(1);
  }
}

// 3. Se connecter à Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 4. Fonction principale
async function createBackup() {
  try {
    console.log('📦 Connexion à Supabase...');
    
    // Liste des tables à sauvegarder
    const tables = [
      'eleves',
      'guides', 
      'lecteurs_externes',
      'mediateurs',
      'coordinateurs',
      'system_settings' // si vous l'avez créée
    ];
    
    const backupData = {
      export_date: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };
    
    // 5. Exporter chaque table
    for (const table of tables) {
      console.log(`📊 Export de la table: ${table}`);
      
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (error) {
          console.log(`⚠️ Table ${table} non trouvée ou erreur:`, error.message);
          backupData.tables[table] = [];
        } else {
          backupData.tables[table] = data || [];
          console.log(`✅ ${table}: ${data?.length || 0} lignes`);
        }
      } catch (err) {
        console.log(`⚠️ Erreur sur ${table}:`, err.message);
        backupData.tables[table] = [];
      }
    }
    
    // 6. Créer le dossier de backup local
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // 7. Sauvegarder dans un fichier
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const fileName = `backup_${dateStr}.json`;
    const filePath = path.join(backupDir, fileName);
    
    // Formatage lisible
    const jsonString = JSON.stringify(backupData, null, 2);
    fs.writeFileSync(filePath, jsonString);
    
    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
    console.log(`💾 Backup sauvegardé: ${fileName} (${fileSize} KB)`);
    
    // 8. Nettoyer les vieux backups (garder 30 jours)
    cleanupOldBackups(backupDir);
    
    // 9. Pousser sur GitHub (si configuré)
    if (process.env.GITHUB_TOKEN) {
      await pushToGitHub(filePath, fileName);
    }
    
    console.log('🎉 Backup terminé avec succès !');
    
  } catch (error) {
    console.error('💥 ERREUR GRAVE:', error);
    process.exit(1);
  }
}

// 10. Nettoyage des anciens backups
function cleanupOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    files.forEach(file => {
      if (file.startsWith('backup_') && file.endsWith('.json')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > thirtyDaysMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Supprimé: ${file} (trop vieux)`);
        }
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🧹 Nettoyage: ${deletedCount} vieux backups supprimés`);
    }
    
  } catch (error) {
    console.log('⚠️ Erreur lors du nettoyage:', error.message);
  }
}

// 11. Pousser sur GitHub
async function pushToGitHub(filePath, fileName) {
  try {
    console.log('🐙 Pushing to GitHub...');
    
    const token = process.env.GITHUB_TOKEN;
    const username = process.env.GITHUB_USERNAME || 'laumaq';
    const repo = process.env.GITHUB_REPO || 'tfh-portal';
    
    // Lire le contenu du fichier
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Créer un commit via l'API GitHub
    const commitMessage = `📦 Backup automatique ${new Date().toLocaleDateString('fr-FR')}`;
    
    // Encodage base64 pour GitHub API
    const contentBase64 = Buffer.from(fileContent).toString('base64');
    
    // URL de l'API GitHub
    const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/backups/${fileName}`;
    
    // Vérifier si le fichier existe déjà
    let sha = null;
    try {
      const checkResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Supabase-Backup-Script'
        }
      });
      
      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        sha = existingFile.sha;
        console.log('📝 Mise à jour du fichier existant');
      }
    } catch (e) {
      // Fichier n'existe pas encore
    }
    
    // Corps de la requête
    const body = {
      message: commitMessage,
      content: contentBase64,
      ...(sha && { sha }) // Inclure le SHA seulement si on met à jour
    };
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Backup-Script'
      },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      console.log('✅ Backup poussé sur GitHub avec succès !');
    } else {
      const errorText = await response.text();
      console.log('⚠️ Erreur GitHub:', errorText);
    }
    
  } catch (error) {
    console.log('⚠️ Impossible de pousser sur GitHub:', error.message);
    console.log('💡 Le backup local est toujours disponible');
  }
}

// 12. Démarrer le backup
createBackup();
