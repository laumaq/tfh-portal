// backup.js - VERSION DEBUG
console.log('=== DEBUG BACKUP ===');

// 1. Vérifier où on est
const fs = require('fs');
const path = require('path');
console.log('Répertoire courant:', __dirname);
console.log('Fichiers dans scripts/:');
fs.readdirSync(__dirname).forEach(file => {
  console.log(' -', file);
});

// 2. Vérifier si .env.local existe AVANT de le charger
const envPath = path.join(__dirname, '.env.local');
console.log('\nChemin .env.local:', envPath);
console.log('.env.local existe?', fs.existsSync(envPath) ? '✅ OUI' : '❌ NON');

if (fs.existsSync(envPath)) {
  console.log('Contenu .env.local (premières 200 chars):');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log(content.substring(0, 200) + '...');
  console.log('Contient SUPABASE_SERVICE_ROLE_KEY?', content.includes('SUPABASE_SERVICE_ROLE_KEY') ? '✅ OUI' : '❌ NON');
}

// 3. Maintenant charger dotenv
require('dotenv').config({ path: envPath });

// 4. Afficher TOUTES les variables d'environnement chargées
console.log('\n🔍 Variables d\'environnement chargées:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? `✅ "${process.env.SUPABASE_URL.substring(0, 30)}..."` : '❌ MANQUANT');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ "${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}..."` : '❌ MANQUANT');
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? `✅ "${process.env.GITHUB_TOKEN.substring(0, 10)}..."` : '❌ MANQUANT');

// 5. Afficher TOUTES les variables pour debug
console.log('\n📋 Toutes les variables .env:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SUPABASE') || key.includes('GITHUB') || key.includes('NODE')) {
    console.log(`  ${key}: "${process.env[key]?.substring(0, 20)}..."`);
  }
});

// ... le reste de votre script existant
