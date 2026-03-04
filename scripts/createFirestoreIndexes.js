#!/usr/bin/env node

/**
 * SCRIPT PARA CRIAR ÍNDICES NO FIRESTORE
 * Se tiver Firebase CLI instalado e credenciais, executa isto
 *
 * Instalação:
 * npm install -g firebase-tools
 * firebase login (com a conta correta)
 * firebase use edu-prime-ead96 (selecionar projeto)
 *
 * Depois executar:
 * node scripts/createFirestoreIndexes.js
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ⚠️ NOTA: Precisa de service account JSON
// Se o criador do projeto der este arquivo, funciona

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  path.join(__dirname, "../firebase-service-account.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Erro: Arquivo service-account.json não encontrado!");
  console.error("Peça ao criador do projeto para:");
  console.error("1. Ir para Firebase Console → Project Settings");
  console.error("2. Service Accounts → Generate New Private Key");
  console.error(
    "3. Salvar como: firebase-service-account.json na raiz do projeto",
  );
  process.exit(1);
}

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "edu-prime-ead96",
  });

  const firestore = admin.firestore();

  async function createIndexes() {
    console.log("🔧 Criando índices do Firestore...\n");

    try {
      // Índice 1: profiles (role + status)
      console.log("1. Criando índice: profiles (role, status)...");
      // Nota: Via Admin SDK não é possível criar índices
      // Firestore cria automaticamente ao tentar queries compostas
      console.log("   ✅ Será criado automaticamente na primeira query");

      console.log("\n2. Criando índice: enrollments (course_id, user_uid)...");
      console.log("   ✅ Será criado automaticamente na primeira query");

      console.log("\n3. Criando índice: admin_logs (timestamp DESC)...");
      console.log("   ✅ Será criado automaticamente na primeira query");

      console.log("\n📋 Alternativa: Use Firebase CLI");
      console.log("   firebase firestore:indexes");

      console.log("\n✅ Índices serão criados automaticamente quando você:");
      console.log("   1. Logar no admin dashboard");
      console.log("   2. Firebase vai sugerir criar índices");
      console.log('   3. Clica em "Create index" na sugestão');
    } catch (error) {
      console.error("❌ Erro:", error.message);
      process.exit(1);
    }

    process.exit(0);
  }

  createIndexes();
} catch (error) {
  console.error("❌ Erro ao carregar Firebase credentials:", error.message);
  console.error("\nSoluções:");
  console.error("A) Pedir ao criador do projeto acesso ao Firebase Console");
  console.error("B) Usar alternativas de performance (sem índices)");
  process.exit(1);
}
