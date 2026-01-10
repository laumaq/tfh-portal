// backup.js - VERSION COMPLÈTE CORRIGÉE
console.log('=== BACKUP TFH PORTAL ===');
console.log('Démarrage à:', new Date().toISOString());

// 1. Vérifier et afficher les variables d'environnement DIRECTEMENT
console.log('\n🔍 Variables d\'environnement reçues:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? `✅ "${process.env.SUPABASE_URL.substring(0, 30)}..."` : '❌ MANQUANT');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ "${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}..."` : '❌ MANQUANT');
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? `✅ "${process.env.GITHUB_TOKEN.substring(0, 10)}..."` : '❌ MANQUANT');
console.log('GITHUB_USERNAME:', process.env.GITHUB_USERNAME || 'Non défini');
console.log('GITHUB_REPO:', process.env.GITHUB_REPO || 'Non défini');

// Vérification CRITIQUE des variables requises
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n💥 ERREUR: Variables Supabase manquantes!');
  console.error('Le workflow doit définir:');
  console.error('  - SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 2. Vérifier les modules nécessaires
try {
  require('@supabase/supabase-js');
  console.log('\n📦 Module @supabase/supabase-js: ✅ OK');
} catch (e) {
  console.error('\n📦 Module @supabase/supabase-js: ❌ MANQUANT');
  console.error('Installez avec: npm install @supabase/supabase-js');
  process.exit(1);
}

// 3. Créer le client Supabase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 4. Fonction principale de backup
async function createBackup() {
  try {
    console.log('\n🚀 Démarrage de l\'export des tables...');
    
    // Liste des tables à sauvegarder
    const tables = ['eleves', 'guides', 'lecteurs_externes', 'mediateurs', 'coordinateurs'];
    const backupData = {
      metadata: {
        export_date: new Date().toISOString(),
        project: 'TFH Portal',
        version: '1.0'
      },
      data: {}
    };
    
    let totalRows = 0;
    
    // Exporter chaque table
    for (const table of tables) {
      console.log(`\n📊 Table: ${table}`);
      
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('id', { ascending: true });
        
        if (error) {
          console.log(`  ❌ Erreur: ${error.message}`);
          backupData.data[table] = [];
          console.log(`  ℹ️  Table ${table} laissée vide à cause d'une erreur`);
        } else {
          const rowCount = data ? data.length : 0;
          console.log(`  ✅ ${rowCount} ligne(s) exportée(s)`);
          backupData.data[table] = data || [];
          totalRows += rowCount;
          
          // Afficher un exemple si la table a des données
          if (data && data.length > 0) {
            const firstRow = data[0];
            const sample = {};
            Object.keys(firstRow).slice(0, 3).forEach(key => {
              sample[key] = firstRow[key];
            });
            console.log(`  📋 Exemple: ${JSON.stringify(sample)}...`);
          }
        }
      } catch (err) {
        console.log(`  💥 Exception: ${err.message}`);
        backupData.data[table] = [];
      }
    }
    
    console.log(`\n📈 Total: ${totalRows} lignes exportées sur ${tables.length} tables`);
    
    // 5. Sauvegarder dans un fichier
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = path.join(__dirname, '..', 'backups');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`\n📁 Dossier créé: ${backupDir}`);
    }
    
    // Nom du fichier avec date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const fileName = `backup_${dateStr}.json`;
    const filePath = path.join(backupDir, fileName);
    
    // Écrire le fichier
    const jsonString = JSON.stringify(backupData, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    
    // Vérifier et afficher les infos du fichier
    const stats = fs.statSync(filePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`\n💾 Fichier créé: ${fileName}`);
    console.log(`📏 Taille: ${fileSizeKB} KB`);
    console.log(`📁 Chemin: ${filePath}`);
    
    // 6. Nettoyer les vieux backups (> 30 jours)
    console.log('\n🧹 Nettoyage des anciens backups...');
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const retentionMs = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.startsWith('backup_') && file.endsWith('.json') && file !== fileName) {
        const oldFilePath = path.join(backupDir, file);
        const fileStats = fs.statSync(oldFilePath);
        const fileAge = now - fileStats.mtimeMs;
        
        if (fileAge > retentionMs) {
          fs.unlinkSync(oldFilePath);
          deletedCount++;
          console.log(`  🗑️  Supprimé: ${file} (${Math.floor(fileAge / (24*60*60*1000))} jours)`);
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ ${deletedCount} ancien(s) backup(s) supprimé(s)`);
    } else {
      console.log('✅ Aucun ancien backup à supprimer');
    }
    
    // 7. Vérifier le nombre de fichiers restants
    const remainingFiles = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'));
    
    console.log(`\n📊 Backups conservés: ${remainingFiles.length} fichier(s)`);
    console.log('🎉 Backup terminé avec succès!');
    
  } catch (error) {
    console.error('\n💥 ERREUR GRAVE dans createBackup():');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 8. Exécuter la fonction principale
createBackup();
