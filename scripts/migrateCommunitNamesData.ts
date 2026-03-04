#!/usr/bin/env node
/**
 * Script para migração de dados da comunidade
 * Adiciona campos authorUid e author aos tópicos e respostas existentes
 * Busca o nome real do usuário a partir da coleção profiles
 */

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  writeBatch,
  DocumentReference,
} from "firebase/firestore";
import { db } from "../services/firebase";

interface CommunityData {
  docId: string;
  docRef: DocumentReference;
  data: any;
}

async function getUserName(uid: string): Promise<string> {
  if (!uid) return "Usuário";
  try {
    const userRef = doc(db, "profiles", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().full_name || "Usuário";
    }
    return "Usuário";
  } catch (error) {
    console.error(`Erro ao buscar nome do usuário ${uid}:`, error);
    return "Usuário";
  }
}

async function migrateCollection(
  collectionName: string,
  isInstructor: boolean = false
) {
  console.log(`\n📦 Iniciando migração de ${collectionName}...`);
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    let updated = 0;
    let skipped = 0;

    for (const document of querySnapshot.docs) {
      const data = document.data();
      const uid = data.user_uid || data.authorUid ||  "";
      const userName = data.user_name || data.author || "";

      // Verificar se já tem os campos necessários
      if (data.authorUid && data.author) {
        skipped++;
        console.log(
          `  ⏭️  ${document.id} já possui authorUid e author (pulando)`
        );
        continue;
      }

      // Se não tem uid, procurar em campo alternativo
      if (!uid) {
        skipped++;
        console.log(
          `  ⚠️  ${document.id} não possui uid (pulando - dados insuficientes)`
        );
        continue;
      }

      // Buscar nome real se não estiver salvo
      let finalName = userName;
      if (!finalName) {
        finalName = await getUserName(uid);
      }

      // Preparar update
      const updateData: any = {
        authorUid: uid,
        author: finalName,
      };

      // Adicionar ao batch
      batch.update(doc(db, collectionName, document.id), updateData);
      updated++;
      console.log(
        `  ✅ ${document.id} será atualizado com authorUid=${uid}, author=${finalName}`
      );

      // Realizar batch a cada 500 documentos
      if (updated % 500 === 0) {
        await batch.commit();
        console.log(`  📤 Batch enviado (500 documentos)`);
      }
    }

    // Commit final
    if (updated > 0) {
      await batch.commit();
      console.log(
        `  📤 Batch final enviado (${updated % 500 || updated} documentos)`
      );
    }

    console.log(
      `\n✅ Migração de ${collectionName} concluída: ${updated} atualizados, ${skipped} pulados`
    );
    return { collection: collectionName, updated, skipped };
  } catch (error) {
    console.error(`❌ Erro ao migrar ${collectionName}:`, error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Iniciando migração de dados da comunidade...\n");

  try {
    const results = [];

    // Migrar tópicos da comunidade de estudantes
    const studentTopics = await migrateCollection("community-topics");
    results.push(studentTopics);

    // Migrar respostas da comunidade de estudantes
    const studentReplies = await migrateCollection("community-replies");
    results.push(studentReplies);

    // Migrar tópicos da comunidade de instrutores
    const instructorTopics = await migrateCollection(
      "instructor-community-topics",
      true
    );
    results.push(instructorTopics);

    // Migrar respostas da comunidade de instrutores
    const instructorReplies = await migrateCollection(
      "instructor-community-replies",
      true
    );
    results.push(instructorReplies);

    // Resumo final
    console.log("\n📊 RESUMO DA MIGRAÇÃO:");
    console.log("=".repeat(60));
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const result of results) {
      console.log(
        `${result.collection}: ${result.updated} atualizados, ${result.skipped} pulados`
      );
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
    }

    console.log("=".repeat(60));
    console.log(`Total: ${totalUpdated} documentos atualizados`);
    console.log(`Total: ${totalSkipped} documentos pulados`);
    console.log(
      "\n✅ Migração concluída com sucesso! Os nomes dos usuários agora serão exibidos corretamente."
    );
  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
    process.exit(1);
  }
}

main();
