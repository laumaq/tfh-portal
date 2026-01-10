// backup.js - VERSION CORRIGÉE
console.log('=== BACKUP TFH PORTAL ===');

// 1. Vérifier les modules
try {
  require('dotenv');
  console.log('✅ dotenv OK');
} catch (e) {
  console.error('❌ dotenv manquant');
  process.exit(1);
}

try {
  require('@supabase/supabase-js');
  console.log('✅ supabase-js OK');
} catch (e) {
  console.error('❌ supabase-js manquant');
  process.exit(1);
}

// 2. Charger les variables
require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Vérification des variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ OK' : '❌ MANQUANT');
console.log('SUPABASE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ OK' : '❌ MANQUANT');
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '✅ OK' : '❌ MANQUANT');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('💥 Variables manquantes!');
  process.exit(1);
}

// 3. Créer le client Supabase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 4. Fonction principale MODIFIÉE pour être plus simple
async function createBackup() {
  try {
    console.log('\n🚀 Démarrage du backup...');
    
    // Tables à sauvegarder
    const tables = ['eleves', 'guides', 'lecteurs_externes', 'mediateurs', 'coordinateurs'];
    const backupData = { date: new Date().toISOString() };
    
    // Pour chaque table
    for (const table of tables) {
      console.log(`📊 ${table}...`);
      
      try {
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
          console.log(`  ⚠️ ${table}: ${error.message}`);
          backupData[table] = [];
        } else {
          console.log(`  ✅ ${table}: ${data?.length || 0} lignes`);
          backupData[table] = data || [];
        }
      } catch (err) {
        console.log(`  ❌ ${table}: ${err.message}`);
        backupData[table] = [];
      }
    }
    
    // Créer le dossier backups
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Sauvegarder le fichier
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `backup_${date}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    const size = (fs.statSync(filePath).size / 1024).toFixed(2);
    console.log(`\n💾 Backup sauvegardé: ${fileName} (${size} KB)`);
    
    // Nettoyer les vieux backups (30 jours)
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    let deleted = 0;
    for (const file of files) {
      if (file.startsWith('backup_') && file.endsWith('.json')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > thirtyDays) {
          fs.unlinkSync(filePath);
          deleted++;
          console.log(`🗑️ Supprimé: ${file}`);
        }
      }
    }
    
    if (deleted > 0) {
      console.log(`🧹 ${deleted} vieux backups supprimés`);
    }
    
    console.log('🎉 Backup terminé avec succès!');
    
  } catch (error) {
    console.error('💥 ERREUR:', error.message);
    process.exit(1);
  }
}

// Démarrer
createBackup();
