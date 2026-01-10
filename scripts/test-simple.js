// test-simple.js - Version ultra simple
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('=== TEST ULTRA SIMPLE ===');

// 1. Vérifiez les variables
console.log('Variables chargées depuis .env.local:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'OK (longueur: ' + process.env.SUPABASE_URL.length + ')' : 'MANQUANT');
console.log('SUPABASE_KEY existe?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// 2. Créez le client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 3. Testez une requête simple
async function test() {
  try {
    console.log('\nTest de connexion...');
    
    // Essayez plusieurs tables
    const tables = ['eleves', 'guides'];
    
    for (const table of tables) {
      console.log(`\nEssai table "${table}":`);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(2);
      
      if (error) {
        console.log(`❌ ${table}:`, error.message);
      } else {
        console.log(`✅ ${table}: ${data?.length || 0} ligne(s) trouvée(s)`);
        if (data && data.length > 0) {
          console.log('Exemple:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
        }
      }
    }
    
    // 4. Créez un petit fichier de test
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`\n📁 Dossier créé: ${backupDir}`);
    }
    
    const testFile = path.join(backupDir, 'test_backup.json');
    fs.writeFileSync(testFile, JSON.stringify({
      test: 'ok',
      date: new Date().toISOString(),
      message: 'Ceci est un test'
    }, null, 2));
    
    console.log(`\n✅ Fichier test créé: ${testFile}`);
    console.log('=== TEST TERMINÉ ===');
    
  } catch (error) {
    console.error('💥 ERREUR GRAVE:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
